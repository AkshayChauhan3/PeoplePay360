"""
Automated Email Delivery Service — PeoplePay360

Manages end-to-end payslip email generation and transmission:
1. ReportLab PDF payslip generation, storage persistence, and attachment.
2. Professional responsive HTML email body with plain-text alternative.
3. Modular EmailProvider abstraction with zero-credential Mock Mode and SMTP.
4. Comprehensive delivery audit tracking (PENDING, SENDING, SENT, FAILED),
   failure classification (TEMPORARY vs PERMANENT), and retry workflows.
"""

import asyncio
from datetime import datetime, timezone
from email.header import Header
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
import smtplib
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.email_delivery import (
    EmailDeliveryStatus,
    EmailFailureType,
    PayslipEmailDelivery,
)
from app.models.payrun import Payrun, PayrunStatus
from app.models.payslip import Payslip, PayslipStatus
from app.schemas.email_delivery import (
    EmailDeliverySummaryResponse,
    PayslipEmailDeliveryDetailResponse,
    PayslipEmailDeliveryItem,
    SendPayslipsResponse,
    SinglePayslipEmailResponse,
)
from app.services import pdf_service
from app.services.email import (
    EmailAttachment,
    EmailMessage,
    get_email_provider,
)
from app.services.storage import get_storage_service

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    """Return current timestamp in UTC."""
    return datetime.now(timezone.utc)


def _generate_storage_key(payslip: Payslip) -> str:
    emp = payslip.employee
    emp_code = emp.employee_code if emp else f"emp_{payslip.employee_id}"
    return f"payruns/{payslip.payrun_id}/payslips/{payslip.id}_{emp_code}_{payslip.period_start}_{payslip.period_end}.pdf"


def build_payslip_email_content(payslip: Payslip) -> tuple[str, str, str]:
    """
    Constructs the email subject, plain text body, and responsive HTML body
    for an employee payslip notification.
    """
    emp = payslip.employee
    emp_name = f"{emp.first_name} {emp.last_name}".strip() if emp else "Valued Employee"
    emp_code = emp.employee_code if emp else "N/A"
    payrun_name = payslip.payrun.name if payslip.payrun else "Payroll"
    period_str = f"{payslip.period_start} to {payslip.period_end}"

    subject = f"Payslip for {payrun_name} ({period_str}) - {emp_name}"

    # Plain text version
    text_body = f"""Dear {emp_name},

Your payslip for the period {period_str} has been generated and approved.

--- Salary Summary ---
Employee Code: {emp_code}
Gross Earnings: INR {payslip.gross_amount:,.2f}
Total Deductions: INR {payslip.deduction_amount:,.2f}
Net Payable Amount: INR {payslip.net_amount:,.2f}
Worked Days: {payslip.worked_days}

Your complete, official salary statement has been attached to this email as a PDF document.

If you have any questions regarding your remuneration or deduction items, please contact the HR & Payroll team.

Warm regards,
Payroll Department
{settings.company_name}
"""

    # Responsive HTML version
    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
    <style>
        body {{
            margin: 0;
            padding: 0;
            background-color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.5;
        }}
        .email-wrapper {{
            max-width: 600px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%);
            color: #ffffff;
            padding: 32px 40px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.025em;
        }}
        .header p {{
            margin: 8px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
        }}
        .content {{
            padding: 36px 40px;
        }}
        .greeting {{
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 12px;
        }}
        .intro-text {{
            font-size: 14px;
            color: #475569;
            margin-bottom: 24px;
        }}
        .highlight-card {{
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #0284c7;
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 24px;
        }}
        .highlight-title {{
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            font-weight: 600;
        }}
        .highlight-amount {{
            font-size: 28px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 4px;
        }}
        .table-container {{
            margin-bottom: 24px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        th, td {{
            padding: 10px 12px;
            font-size: 13px;
            border-bottom: 1px solid #f1f5f9;
        }}
        th {{
            text-align: left;
            color: #64748b;
            font-weight: 600;
        }}
        .text-right {{
            text-align: right;
        }}
        .font-bold {{
            font-weight: 600;
        }}
        .attachment-banner {{
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 14px 18px;
            font-size: 13px;
            color: #166534;
            display: flex;
            align-items: center;
            margin-bottom: 24px;
        }}
        .attachment-banner strong {{
            display: block;
            margin-bottom: 2px;
        }}
        .footer {{
            background-color: #f8fafc;
            padding: 24px 40px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #64748b;
        }}
        .footer p {{
            margin: 4px 0;
        }}
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="header">
            <h1>{settings.company_name}</h1>
            <p>Official Salary Statement & Remuneration Advice</p>
        </div>
        <div class="content">
            <div class="greeting">Dear {emp_name},</div>
            <div class="intro-text">
                Your compensation for <strong>{payrun_name}</strong> covering the cycle <strong>{period_str}</strong> has been finalized.
            </div>

            <div class="highlight-card">
                <div class="highlight-title">Net Take-Home Salary</div>
                <div class="highlight-amount">₹{payslip.net_amount:,.2f}</div>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Summary Attribute</th>
                            <th class="text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Employee Code</td>
                            <td class="text-right font-bold">{emp_code}</td>
                        </tr>
                        <tr>
                            <td>Pay Period</td>
                            <td class="text-right">{period_str}</td>
                        </tr>
                        <tr>
                            <td>Worked Days</td>
                            <td class="text-right">{payslip.worked_days} days</td>
                        </tr>
                        <tr>
                            <td>Gross Remuneration</td>
                            <td class="text-right">₹{payslip.gross_amount:,.2f}</td>
                        </tr>
                        <tr>
                            <td>Total Statutory & Other Deductions</td>
                            <td class="text-right" style="color: #b91c1c;">- ₹{payslip.deduction_amount:,.2f}</td>
                        </tr>
                        <tr style="background-color: #f1f5f9;">
                            <td class="font-bold">Net Payable Amount</td>
                            <td class="text-right font-bold" style="color: #0369a1;">₹{payslip.net_amount:,.2f}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="attachment-banner">
                <div>
                    <strong>PDF Salary Slip Attached</strong>
                    An encrypted, high-fidelity salary slip detailing all calculation rules and tax deductions is attached to this email.
                </div>
            </div>

            <p style="font-size: 13px; color: #64748b; margin: 0;">
                If you notice discrepancies or have queries regarding tax withholdings, please reach out to the Payroll team promptly.
            </p>
        </div>
        <div class="footer">
            <p>This is an automated system notification from PeoplePay360.</p>
            <p>&copy; {datetime.now().year} {settings.company_name}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>"""

    return subject, text_body, html_body


def compose_payslip_mime_message(
    payslip: Payslip,
    pdf_bytes: bytes,
    sender_email: str,
    sender_name: str,
) -> tuple[MIMEMultipart, str, str]:
    """
    Packages the HTML body, plain text alternative, and ReportLab PDF attachment
    into a standards-compliant MIME multipart email message.
    """
    emp = payslip.employee
    recipient_email = emp.email.strip() if emp and emp.email else ""
    recipient_name = f"{emp.first_name} {emp.last_name}".strip() if emp else "Employee"
    emp_code = emp.employee_code if emp else "EMP"

    subject, text_body, html_body = build_payslip_email_content(payslip)

    # Top-level container
    msg = MIMEMultipart("mixed")
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = f"{sender_name} <{sender_email}>"
    msg["To"] = f"{recipient_name} <{recipient_email}>"

    # Alternative container for text and html
    alt_part = MIMEMultipart("alternative")
    alt_part.attach(MIMEText(text_body, "plain", "utf-8"))
    alt_part.attach(MIMEText(html_body, "html", "utf-8"))
    msg.attach(alt_part)

    # PDF Attachment
    filename = f"Payslip_{emp_code}_{payslip.period_start}_{payslip.period_end}.pdf"
    pdf_part = MIMEApplication(pdf_bytes, _subtype="pdf")
    pdf_part.add_header("Content-Disposition", "attachment", filename=filename)
    msg.attach(pdf_part)

    return msg, recipient_email, subject


def _send_smtp_sync(
    to_email: str,
    msg: MIMEMultipart,
    is_live_smtp: bool,
) -> tuple[bool, str | None]:
    """
    Synchronous SMTP transmission executed within a worker thread.
    Handles both live SMTP and Mock Mode simulation.
    """
    if not to_email or "@" not in to_email or "." not in to_email.split("@")[-1]:
        return False, f"Invalid recipient email address: '{to_email}'"

    if "fail@" in to_email.lower() or "invalid-mock" in to_email.lower():
        return False, "Simulated delivery rejection: mailbox unavailable or bounce rule triggered."

    if not is_live_smtp:
        logger.info(
            "Mock Email Sent -> To: %s | Subject: %s | Size: %d bytes",
            to_email,
            msg.get("Subject"),
            len(msg.as_bytes()),
        )
        return True, None

    try:
        if settings.smtp_port == 465:
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=15)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15)
            if settings.smtp_use_tls:
                server.starttls()

        if settings.smtp_user and settings.smtp_password:
            server.login(settings.smtp_user, settings.smtp_password)

        server.send_message(msg)
        server.quit()
        return True, None
    except smtplib.SMTPException as e:
        logger.error("SMTP error sending email to %s: %s", to_email, str(e))
        return False, f"SMTP error: {str(e)}"
    except Exception as e:
        logger.error("Network exception sending email to %s: %s", to_email, str(e))
        return False, f"Network error: {str(e)}"


async def send_single_payslip_email(
    db: AsyncSession,
    payslip_id: int,
) -> SinglePayslipEmailResponse:
    """
    Generates and sends an individual employee's PDF payslip email.
    Creates or updates the delivery audit record in `payslip_email_deliveries`.
    """
    # 1. Fetch payslip with all relationships eagerly loaded
    query = (
        select(Payslip)
        .options(
            selectinload(Payslip.employee),
            selectinload(Payslip.payrun),
            selectinload(Payslip.contract),
            selectinload(Payslip.salary_structure),
            selectinload(Payslip.lines),
        )
        .where(Payslip.id == payslip_id)
    )
    res = await db.execute(query)
    payslip = res.scalar_one_or_none()
    if not payslip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payslip with ID {payslip_id} not found.",
        )

    # 2. State Guardrail: Payrun must be VALIDATED or PAID
    if not payslip.payrun or payslip.payrun.status not in (PayrunStatus.VALIDATED, PayrunStatus.PAID):
        payrun_status = payslip.payrun.status.value if payslip.payrun else "UNKNOWN"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot email payslip in {payrun_status} payrun state. "
                "Email delivery is permitted strictly for VALIDATED or PAID payruns."
            ),
        )

    # 3. PDF Persistence via Storage Service
    storage_service = get_storage_service()
    storage_key = payslip.pdf_storage_key or _generate_storage_key(payslip)
    pdf_bytes = await storage_service.get_payslip_pdf(storage_key)
    if not pdf_bytes:
        pdf_bytes = pdf_service.generate_payslip_pdf(payslip, company_name=settings.company_name)
        await storage_service.save_payslip_pdf(storage_key, pdf_bytes)
    payslip.pdf_storage_key = storage_key

    # 4. Dispatch via Email Provider
    email_provider = get_email_provider()
    emp = payslip.employee
    emp_name = f"{emp.first_name} {emp.last_name}".strip() if emp else "Employee"
    recipient_email = emp.email.strip() if emp and emp.email else ""
    subject, text_body, html_body = build_payslip_email_content(payslip)

    filename = f"Payslip_{emp.employee_code if emp else 'EMP'}_{payslip.period_start}_{payslip.period_end}.pdf"
    attachment = EmailAttachment(filename=filename, content=pdf_bytes, mime_type="application/pdf")
    email_message = EmailMessage(
        to_email=recipient_email,
        to_name=emp_name,
        subject=subject,
        html_body=html_body,
        text_body=text_body,
        attachments=[attachment],
    )

    result = await email_provider.send_email(email_message)
    success = result.success
    error_msg = result.error_message
    fail_type = result.failure_type

    # 5. Upsert delivery record
    del_query = select(PayslipEmailDelivery).where(
        PayslipEmailDelivery.payrun_id == payslip.payrun_id,
        PayslipEmailDelivery.payslip_id == payslip.id,
    )
    del_res = await db.execute(del_query)
    delivery = del_res.scalar_one_or_none()

    now = _utcnow()
    if delivery:
        delivery.retry_count += 1
        delivery.attempt_count = (delivery.attempt_count or 0) + 1
        delivery.status = EmailDeliveryStatus.SENT if success else EmailDeliveryStatus.FAILED
        delivery.error_message = error_msg if not success else None
        delivery.failure_type = fail_type if not success else None
        delivery.last_attempt_at = now
        delivery.storage_key = storage_key
        delivery.sent_at = now if success else None
        delivery.updated_at = now
    else:
        delivery = PayslipEmailDelivery(
            payrun_id=payslip.payrun_id,
            payslip_id=payslip.id,
            employee_id=payslip.employee_id,
            recipient_email=recipient_email,
            recipient_name=emp_name,
            subject=subject,
            status=EmailDeliveryStatus.SENT if success else EmailDeliveryStatus.FAILED,
            error_message=error_msg if not success else None,
            failure_type=fail_type if not success else None,
            retry_count=0,
            attempt_count=1,
            last_attempt_at=now,
            storage_key=storage_key,
            sent_at=now if success else None,
            created_at=now,
            updated_at=now,
        )
        db.add(delivery)

    await db.commit()
    await db.refresh(delivery)

    return SinglePayslipEmailResponse(
        payslip_id=payslip.id,
        employee_id=payslip.employee_id,
        recipient_email=recipient_email,
        status=delivery.status,
        error_message=delivery.error_message,
        sent_at=delivery.sent_at,
        message=(
            f"Payslip email successfully sent to {recipient_email}"
            if success
            else f"Delivery failed: {error_msg}"
        ),
    )


async def deliver_payrun_payslips(
    db: AsyncSession,
    payrun_id: int,
    retry_failed_only: bool = False,
    force_resend_all: bool = False,
) -> SendPayslipsResponse:
    """
    Batch distributes PDF payslips to employees belonging to a payrun.

    Features:
    - State Guardrail: Rejects DRAFT or COMPUTED payruns with HTTP 400.
    - Anti-Spam: Automatically skips employees who already have status SENT unless force_resend_all=True.
    - Retry Failed: When retry_failed_only=True, processes strictly payslips where previous status is FAILED.
    - Audit Trail: Upserts persistent record in `payslip_email_deliveries`.
    """
    # 1. Fetch payrun with payslips and employees
    query = (
        select(Payrun)
        .options(
            selectinload(Payrun.payslips).selectinload(Payslip.employee),
            selectinload(Payrun.payslips).selectinload(Payslip.lines),
            selectinload(Payrun.payslips).selectinload(Payslip.contract),
            selectinload(Payrun.payslips).selectinload(Payslip.salary_structure),
        )
        .where(Payrun.id == payrun_id)
    )
    res = await db.execute(query)
    payrun = res.scalar_one_or_none()
    if not payrun:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payrun with ID {payrun_id} not found.",
        )

    # 2. State Guardrail: Payrun must be VALIDATED or PAID
    if payrun.status not in (PayrunStatus.VALIDATED, PayrunStatus.PAID):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot email payslips for payrun in {payrun.status.value} status. "
                "Only VALIDATED or PAID payruns are eligible for payslip distribution."
            ),
        )

    if not payrun.payslips:
        return SendPayslipsResponse(
            payrun_id=payrun.id,
            total_payslips=0,
            processed_count=0,
            sent_count=0,
            failed_count=0,
            skipped_count=0,
            message="No payslips found in this payrun batch.",
        )

    # 3. Load existing delivery records for this payrun
    existing_records_res = await db.execute(
        select(PayslipEmailDelivery).where(PayslipEmailDelivery.payrun_id == payrun.id)
    )
    existing_deliveries = {d.payslip_id: d for d in existing_records_res.scalars().all()}

    storage_service = get_storage_service()
    email_provider = get_email_provider()

    total_payslips = len(payrun.payslips)
    sent_count = 0
    failed_count = 0
    skipped_count = 0
    processed_count = 0

    for ps in payrun.payslips:
        existing = existing_deliveries.get(ps.id)

        # Filtering logic
        if retry_failed_only:
            # Strictly target FAILED or unattempted
            if existing and existing.status == EmailDeliveryStatus.SENT:
                skipped_count += 1
                continue
        elif not force_resend_all:
            # Default behavior: Skip already SENT to avoid double-spamming
            if existing and existing.status == EmailDeliveryStatus.SENT:
                skipped_count += 1
                continue

        processed_count += 1

        # PDF Storage Resolution & Generation
        storage_key = ps.pdf_storage_key or (existing.storage_key if existing else None) or _generate_storage_key(ps)
        pdf_bytes = await storage_service.get_payslip_pdf(storage_key)
        if not pdf_bytes:
            pdf_bytes = pdf_service.generate_payslip_pdf(ps, company_name=settings.company_name)
            await storage_service.save_payslip_pdf(storage_key, pdf_bytes)
        ps.pdf_storage_key = storage_key

        # Prepare Email Message
        emp = ps.employee
        emp_name = f"{emp.first_name} {emp.last_name}".strip() if emp else "Employee"
        recipient_email = emp.email.strip() if emp and emp.email else ""
        subject, text_body, html_body = build_payslip_email_content(ps)

        filename = f"Payslip_{emp.employee_code if emp else 'EMP'}_{ps.period_start}_{ps.period_end}.pdf"
        attachment = EmailAttachment(filename=filename, content=pdf_bytes, mime_type="application/pdf")
        email_message = EmailMessage(
            to_email=recipient_email,
            to_name=emp_name,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
            attachments=[attachment],
        )

        # Dispatch
        result = await email_provider.send_email(email_message)
        success = result.success
        error_msg = result.error_message
        fail_type = result.failure_type

        now = _utcnow()
        if existing:
            existing.retry_count += 1
            existing.attempt_count = (existing.attempt_count or 0) + 1
            existing.status = EmailDeliveryStatus.SENT if success else EmailDeliveryStatus.FAILED
            existing.error_message = error_msg if not success else None
            existing.failure_type = fail_type if not success else None
            existing.last_attempt_at = now
            existing.storage_key = storage_key
            existing.sent_at = now if success else None
            existing.updated_at = now
        else:
            new_del = PayslipEmailDelivery(
                payrun_id=payrun.id,
                payslip_id=ps.id,
                employee_id=ps.employee_id,
                recipient_email=recipient_email,
                recipient_name=emp_name,
                subject=subject,
                status=EmailDeliveryStatus.SENT if success else EmailDeliveryStatus.FAILED,
                error_message=error_msg if not success else None,
                failure_type=fail_type if not success else None,
                retry_count=0,
                attempt_count=1,
                last_attempt_at=now,
                storage_key=storage_key,
                sent_at=now if success else None,
                created_at=now,
                updated_at=now,
            )
            db.add(new_del)
            existing_deliveries[ps.id] = new_del

        if success:
            sent_count += 1
        else:
            failed_count += 1

    await db.commit()

    action_label = "Retry failed delivery" if retry_failed_only else "Payslip email delivery"
    return SendPayslipsResponse(
        payrun_id=payrun.id,
        total_payslips=total_payslips,
        processed_count=processed_count,
        sent_count=sent_count,
        failed_count=failed_count,
        skipped_count=skipped_count,
        message=(
            f"{action_label} completed: {sent_count} sent, {failed_count} failed, "
            f"{skipped_count} skipped (already delivered)."
        ),
    )


async def get_payrun_email_delivery_summary(
    db: AsyncSession,
    payrun_id: int,
) -> EmailDeliverySummaryResponse:
    """
    Computes real-time email distribution metrics and itemized delivery logs for a payrun.
    """
    # 1. Fetch payrun with payslips and employees
    query = (
        select(Payrun)
        .options(
            selectinload(Payrun.payslips).selectinload(Payslip.employee),
        )
        .where(Payrun.id == payrun_id)
    )
    res = await db.execute(query)
    payrun = res.scalar_one_or_none()
    if not payrun:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payrun with ID {payrun_id} not found.",
        )

    # 2. Fetch all delivery audit records for this payrun
    del_query = (
        select(PayslipEmailDelivery)
        .where(PayslipEmailDelivery.payrun_id == payrun.id)
        .order_by(PayslipEmailDelivery.id.asc())
    )
    del_res = await db.execute(del_query)
    deliveries = list(del_res.scalars().all())

    sent_count = 0
    failed_count = 0
    pending_count = 0

    for d in deliveries:
        if d.status == EmailDeliveryStatus.SENT:
            sent_count += 1
        elif d.status == EmailDeliveryStatus.FAILED:
            failed_count += 1
        elif d.status in (EmailDeliveryStatus.PENDING, EmailDeliveryStatus.SENDING):
            pending_count += 1

    total_payslips = len(payrun.payslips)
    not_attempted_count = total_payslips - len(deliveries)
    can_retry = failed_count > 0 or not_attempted_count > 0

    # 3. Format items
    items: list[PayslipEmailDeliveryItem] = []
    emp_map = {ps.id: ps.employee for ps in payrun.payslips}

    for d in deliveries:
        emp = emp_map.get(d.payslip_id)
        code = emp.employee_code if emp else "EMP"
        name = f"{emp.first_name} {emp.last_name}".strip() if emp else d.recipient_name

        items.append(
            PayslipEmailDeliveryItem(
                id=d.id,
                payrun_id=d.payrun_id,
                payslip_id=d.payslip_id,
                employee_id=d.employee_id,
                employee_code=code,
                employee_name=name,
                recipient_email=d.recipient_email,
                recipient_name=d.recipient_name,
                subject=d.subject,
                status=d.status,
                error_message=d.error_message,
                retry_count=d.retry_count,
                attempt_count=d.attempt_count or d.retry_count,
                failure_type=d.failure_type,
                last_attempt_at=d.last_attempt_at,
                next_retry_at=d.next_retry_at,
                storage_key=d.storage_key,
                sent_at=d.sent_at,
                created_at=d.created_at,
            )
        )

    return EmailDeliverySummaryResponse(
        payrun_id=payrun.id,
        payrun_name=payrun.name,
        total_payslips=total_payslips,
        sent_count=sent_count,
        failed_count=failed_count,
        pending_count=pending_count,
        not_attempted_count=not_attempted_count,
        can_retry=can_retry,
        deliveries=items,
    )


async def get_single_payslip_email_delivery(
    db: AsyncSession,
    payslip_id: int,
) -> PayslipEmailDeliveryDetailResponse:
    """
    Retrieves the email delivery status, attempt counts, and error details for a payslip.
    """
    res = await db.execute(
        select(PayslipEmailDelivery).where(PayslipEmailDelivery.payslip_id == payslip_id)
    )
    delivery = res.scalar_one_or_none()
    if not delivery:
        # Check if payslip exists
        ps_res = await db.execute(select(Payslip).where(Payslip.id == payslip_id))
        ps = ps_res.scalar_one_or_none()
        if not ps:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Payslip with ID {payslip_id} not found.",
            )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No email delivery record found for payslip with ID {payslip_id}.",
        )

    return PayslipEmailDeliveryDetailResponse(
        payslip_id=delivery.payslip_id,
        employee_id=delivery.employee_id,
        recipient_email=delivery.recipient_email,
        status=delivery.status,
        attempt_count=delivery.attempt_count or delivery.retry_count,
        failure_type=delivery.failure_type,
        error_message=delivery.error_message,
        sent_at=delivery.sent_at,
        last_attempt_at=delivery.last_attempt_at,
        next_retry_at=delivery.next_retry_at,
        storage_key=delivery.storage_key,
    )
