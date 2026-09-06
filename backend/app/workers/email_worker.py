"""
Email Delivery Background Worker — PeoplePay360

Provides asynchronous background processing for payslip distribution:
1. ARQ-compatible task functions (`send_payslip_email_job`, `process_payrun_emails_job`).
2. Atomic database claiming (PENDING/FAILED -> SENDING) to prevent duplicate sends across concurrent workers.
3. PDF storage integration (checks/persists to Storage backend).
4. Failure classification (TEMPORARY vs PERMANENT) and exponential backoff retry scheduling.
5. Zero-external-dependency fallback for local development when Redis is disabled/unreachable.
"""

import asyncio
from datetime import datetime, timedelta, timezone
import logging
import uuid

from arq.connections import RedisSettings, create_pool
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.models.email_delivery import (
    EmailDeliveryStatus,
    EmailFailureType,
    PayslipEmailDelivery,
)
from app.models.payrun import Payrun, PayrunStatus
from app.models.payslip import Payslip
from app.services import pdf_service
from app.services.email import (
    EmailAttachment,
    EmailMessage,
    get_email_provider,
)
from app.services.storage import get_storage_service

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _generate_storage_key(payslip: Payslip) -> str:
    emp = payslip.employee
    emp_code = emp.employee_code if emp else f"emp_{payslip.employee_id}"
    return f"payruns/{payslip.payrun_id}/payslips/{payslip.id}_{emp_code}_{payslip.period_start}_{payslip.period_end}.pdf"


async def _process_delivery_with_session(db: AsyncSession, delivery_id: int) -> dict:
    # 1. Atomic Row Claiming (PENDING/FAILED -> SENDING)
    now = _utcnow()
    claim_stmt = (
        update(PayslipEmailDelivery)
        .where(
            PayslipEmailDelivery.id == delivery_id,
            PayslipEmailDelivery.status.in_([EmailDeliveryStatus.PENDING, EmailDeliveryStatus.FAILED]),
        )
        .values(
            status=EmailDeliveryStatus.SENDING,
            last_attempt_at=now,
            updated_at=now,
        )
        .returning(PayslipEmailDelivery.id)
    )
    res = await db.execute(claim_stmt)
    claimed_id = res.scalar_one_or_none()
    await db.commit()

    if not claimed_id:
        logger.info("Delivery #%d was already claimed or is not in PENDING/FAILED state. Skipping.", delivery_id)
        return {"delivery_id": delivery_id, "status": "skipped", "reason": "Not claimable"}

    # 2. Fetch full delivery record with eagerly loaded relations
    query = (
        select(PayslipEmailDelivery)
        .options(
            selectinload(PayslipEmailDelivery.payslip).selectinload(Payslip.employee),
            selectinload(PayslipEmailDelivery.payslip).selectinload(Payslip.payrun),
            selectinload(PayslipEmailDelivery.payslip).selectinload(Payslip.contract),
            selectinload(PayslipEmailDelivery.payslip).selectinload(Payslip.salary_structure),
            selectinload(PayslipEmailDelivery.payslip).selectinload(Payslip.lines),
        )
        .where(PayslipEmailDelivery.id == delivery_id)
    )
    del_res = await db.execute(query)
    delivery = del_res.scalar_one_or_none()

    if not delivery or not delivery.payslip:
        logger.error("Delivery #%d or associated payslip not found.", delivery_id)
        return {"delivery_id": delivery_id, "status": "error", "reason": "Not found"}

    payslip = delivery.payslip
    storage_service = get_storage_service()
    email_provider = get_email_provider()

    # 3. PDF Resolution & Storage
    storage_key = delivery.storage_key or payslip.pdf_storage_key or _generate_storage_key(payslip)
    pdf_bytes = await storage_service.get_payslip_pdf(storage_key)

    if not pdf_bytes:
        # Generate ReportLab PDF on-demand and cache in storage
        pdf_bytes = pdf_service.generate_payslip_pdf(payslip, company_name=settings.company_name)
        await storage_service.save_payslip_pdf(storage_key, pdf_bytes)

    # Update storage keys in database
    payslip.pdf_storage_key = storage_key
    delivery.storage_key = storage_key

    # 4. Prepare Email Content & Attachment
    from app.services.email_delivery_service import build_payslip_email_content
    subject, text_body, html_body = build_payslip_email_content(payslip)

    filename = f"Payslip_{payslip.employee.employee_code if payslip.employee else 'EMP'}_{payslip.period_start}_{payslip.period_end}.pdf"
    attachment = EmailAttachment(
        filename=filename,
        content=pdf_bytes,
        mime_type="application/pdf",
    )

    message = EmailMessage(
        to_email=delivery.recipient_email,
        to_name=delivery.recipient_name,
        subject=subject,
        html_body=html_body,
        text_body=text_body,
        attachments=[attachment],
    )

    # 5. Dispatch via Email Provider
    send_result = await email_provider.send_email(message)

    # 6. Update Delivery Audit State
    exec_time = _utcnow()
    delivery.attempt_count += 1
    delivery.last_attempt_at = exec_time
    delivery.updated_at = exec_time

    if send_result.success:
        delivery.status = EmailDeliveryStatus.SENT
        delivery.sent_at = exec_time
        delivery.error_message = None
        delivery.failure_type = None
        delivery.next_retry_at = None
        logger.info("Successfully delivered payslip #%d to %s", payslip.id, delivery.recipient_email)
    else:
        delivery.error_message = send_result.error_message
        delivery.failure_type = send_result.failure_type

        # Check eligibility for retry: must be TEMPORARY and under max attempts
        can_retry = (
            send_result.failure_type == EmailFailureType.TEMPORARY
            and delivery.attempt_count < settings.email_max_retries
        )

        if can_retry:
            delivery.status = EmailDeliveryStatus.PENDING
            backoff = settings.email_retry_backoff_seconds * (2 ** (delivery.attempt_count - 1))
            delivery.next_retry_at = exec_time + timedelta(seconds=backoff)
            logger.warning(
                "Temporary failure for delivery #%d (%s). Scheduling retry #%d in %d seconds.",
                delivery.id,
                delivery.recipient_email,
                delivery.attempt_count + 1,
                backoff,
            )
            # Re-enqueue with delay
            await enqueue_delivery_job(delivery.id, delay_seconds=backoff)
        else:
            delivery.status = EmailDeliveryStatus.FAILED
            delivery.next_retry_at = None
            logger.error(
                "Permanent or exhausted failure for delivery #%d (%s): %s",
                delivery.id,
                delivery.recipient_email,
                send_result.error_message,
            )

    await db.commit()
    return {
        "delivery_id": delivery_id,
        "status": delivery.status.value,
        "attempt_count": delivery.attempt_count,
        "error_message": delivery.error_message,
    }


async def send_payslip_email_job(
    ctx: dict | None,
    delivery_id: int,
    db: AsyncSession | None = None,
) -> dict:
    """
    Worker task that processes a single payslip email delivery attempt.
    Enforces atomic row claiming, PDF generation/caching, email provider dispatch,
    and retry backoff scheduling.
    """
    if db is not None:
        return await _process_delivery_with_session(db, delivery_id)
    async with AsyncSessionLocal() as session:
        return await _process_delivery_with_session(session, delivery_id)


async def enqueue_delivery_job(delivery_id: int, delay_seconds: int = 0) -> str:
    """
    Enqueues a delivery task.
    If Redis is configured and enabled, pushes to ARQ worker queue.
    Otherwise (for zero-dependency local development), launches an in-process asyncio task.
    """
    if settings.redis_enabled:
        try:
            redis_pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))
            defer = timedelta(seconds=delay_seconds) if delay_seconds > 0 else None
            job = await redis_pool.enqueue_job(
                "send_payslip_email_job",
                delivery_id=delivery_id,
                _defer_by=defer,
            )
            await redis_pool.close()
            if job:
                return job.job_id
        except Exception as e:
            logger.warning("Failed to enqueue to Redis ARQ: %s. Falling back to background asyncio task.", e)

    # In-process background task execution fallback
    async def _delayed_task():
        if delay_seconds > 0:
            await asyncio.sleep(delay_seconds)
        await send_payslip_email_job(ctx=None, delivery_id=delivery_id)

    asyncio.create_task(_delayed_task())
    return f"local-task-{uuid.uuid4().hex[:8]}"


async def process_payrun_emails_job(
    ctx: dict | None,
    payrun_id: int,
    force_resend_all: bool = False,
    retry_failed_only: bool = False,
) -> dict:
    """
    Background batch processor for a payrun.
    Creates delivery records and enqueues individual delivery tasks.
    """
    from app.services.email_delivery_service import deliver_payrun_payslips

    async with AsyncSessionLocal() as db:
        resp = await deliver_payrun_payslips(
            db=db,
            payrun_id=payrun_id,
            retry_failed_only=retry_failed_only,
            force_resend_all=force_resend_all,
        )
        return resp.model_dump()


class WorkerSettings:
    """ARQ Worker configuration for standalone execution via `arq app.workers.email_worker.WorkerSettings`."""
    functions = [send_payslip_email_job, process_payrun_emails_job]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    max_jobs = 10
    job_timeout = 300
