"""
Automated Email Delivery Service — PeoplePay360

Manages end-to-end payslip email generation and transmission:
1. ReportLab PDF payslip generation and attachment.
2. Professional responsive HTML email body with plain-text alternative.
3. Threaded asynchronous SMTP transport with zero-credential Mock Mode.
4. Comprehensive delivery audit tracking (SENT vs FAILED) and HR 'Retry Failed' workflow.
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
from app.models.email_delivery import EmailDeliveryStatus, PayslipEmailDelivery
from app.models.payrun import Payrun, PayrunStatus
from app.models.payslip import Payslip, PayslipStatus
from app.schemas.email_delivery import (
    EmailDeliverySummaryResponse,
    PayslipEmailDeliveryItem,
    SendPayslipsResponse,
    SinglePayslipEmailResponse,
)
from app.services import pdf_service

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    """Return current timestamp in UTC."""
    return datetime.now(timezone.utc)


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
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }}
        .header {{
            background: #0f172a;
            color: #ffffff;
            padding: 30px 40px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }}
        .header p {{
            margin: 8px 0 0 0;
            color: #94a3b8;
            font-size: 13px;
        }}
        .content {{
            padding: 36px 40px;
        }}
        .greeting {{
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 12px;
            color: #0f172a;
        }}
        .intro-text {{
            font-size: 14px;
            color: #475569;
            margin-bottom: 24px;
        }}
        .highlight-card {{
            background-color: #f8fafc;
            border-left: 4px solid #0284c7;
            border-radius: 6px;
            padding: 16px 20px;
            margin-bottom: 24px;
        }}
        .highlight-title {{
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 4px;
        }}
        .highlight-amount {{
            font-size: 26px;
            font-weight: 700;
            color: #0369a1;
        }}
        .table-container {{
            margin-bottom: 24px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }}
        th, td {{
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }}
        th {{
            background-color: #f8fafc;
            color: #475569;
            font-weight: 600;
        }}
        .text-right {{
            text-align: right;
        }}
        .font-bold {{
            font-weight: 700;
        }}
        .badge {{
            display: inline-block;
            background: #e0f2fe;
            color: #0369a1;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
        }}
        .attachment-notice {{
            background-color: #ecfdf5;
            border: 1px dashed #10b981;
            border-radius: 8px;
            padding: 14px 18px;
            font-size: 13px;
            color: #065f46;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
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

            <div class="attachment-notice">
                <span>📎 <strong>PDF Payslip Attached:</strong> An official digital copy of your itemized ReportLab payslip is attached to this email for your records.</span>
            </div>

            <p style="font-size: 13px; color: #64748b; margin: 0;">
                If you have any questions or notice any discrepancy regarding your salary calculation, please contact the Payroll Department.
            </p>
        </div>
        <div class="footer">
            <p><strong>{settings.company_name}</strong> • Payroll Operations</p>
            <p>This is an automated confidential communication. Please do not reply directly to this email.</p>
        </div>
    </div>
</body>
</html>
"""

    return subject, text_body, html_body


def compose_payslip_mime_message(
    payslip: Payslip,
    pdf_bytes: bytes,
    sender_email: str,
    sender_name: str,
) -> tuple[MIMEMultipart, str]:
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
    # 1. Validation checks
    if not to_email or "@" not in to_email or "." not in to_email.split("@")[-1]:
        return False, f"Invalid recipient email address: '{to_email}'"

    # Test trigger simulation: any address with fail@ or invalid-test
    if "fail@" in to_email.lower() or "invalid-mock" in to_email.lower():
        return False, "Simulated delivery rejection: mailbox unavailable or bounce rule triggered."

    # 2. Mock Delivery Mode
    if not is_live_smtp:
        logger.info(
            "Mock Email Sent -> To: %s | Subject: %s | Size: %d bytes",
            to_email,
            msg.get("Subject"),
            len(msg.as_bytes()),
        )
        return True, None

    # 3. Live SMTP Transmission
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

    # 3. Generate ReportLab PDF
    pdf_bytes = pdf_service.generate_payslip_pdf(payslip, company_name=settings.company_name)

    # 4. Compose MIME multipart message
    msg, recipient_email, email_subject = compose_payslip_mime_message(
        payslip=payslip,
        pdf_bytes=pdf_bytes,
        sender_email=settings.smtp_from_email,
        sender_name=settings.smtp_from_name,
    )

    # 5. Transmit in thread pool
    is_live = settings.is_smtp_configured
    success, error_msg = await asyncio.to_thread(_send_smtp_sync, recipient_email, msg, is_live)

    # 6. Upsert delivery record
    del_query = select(PayslipEmailDelivery).where(
        PayslipEmailDelivery.payrun_id == payslip.payrun_id,
        PayslipEmailDelivery.payslip_id == payslip.id,
    )
    del_res = await db.execute(del_query)
    delivery = del_res.scalar_one_or_none()

    now = _utcnow()
    emp_name = (
        f"{payslip.employee.first_name} {payslip.employee.last_name}".strip()
        if payslip.employee
        else "Employee"
    )

    if delivery:
        delivery.retry_count += 1
        delivery.status = EmailDeliveryStatus.SENT if success else EmailDeliveryStatus.FAILED
        delivery.error_message = error_msg if not success else None
        delivery.sent_at = now if success else None
        delivery.updated_at = now
    else:
        delivery = PayslipEmailDelivery(
            payrun_id=payslip.payrun_id,
            payslip_id=payslip.id,
            employee_id=payslip.employee_id,
            recipient_email=recipient_email,
            recipient_name=emp_name,
            subject=email_subject,
            status=EmailDeliveryStatus.SENT if success else EmailDeliveryStatus.FAILED,
            error_message=error_msg if not success else None,
            retry_count=0,
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

    is_live = settings.is_smtp_configured
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

        # Generate ReportLab PDF
        pdf_bytes = pdf_service.generate_payslip_pdf(ps, company_name=settings.company_name)

        # Build MIME Message
        msg, recipient_email, email_subject = compose_payslip_mime_message(
            payslip=ps,
            pdf_bytes=pdf_bytes,
            sender_email=settings.smtp_from_email,
            sender_name=settings.smtp_from_name,
        )

        # Transmit
        success, error_msg = await asyncio.to_thread(_send_smtp_sync, recipient_email, msg, is_live)

        now = _utcnow()
        emp_name = (
            f"{ps.employee.first_name} {ps.employee.last_name}".strip()
            if ps.employee
            else "Employee"
        )

        if existing:
            existing.retry_count += 1
            existing.status = EmailDeliveryStatus.SENT if success else EmailDeliveryStatus.FAILED
            existing.error_message = error_msg if not success else None
            existing.sent_at = now if success else None
            existing.updated_at = now
        else:
            new_del = PayslipEmailDelivery(
                payrun_id=payrun.id,
                payslip_id=ps.id,
                employee_id=ps.employee_id,
                recipient_email=recipient_email,
                recipient_name=emp_name,
                subject=email_subject,
                status=EmailDeliveryStatus.SENT if success else EmailDeliveryStatus.FAILED,
                error_message=error_msg if not success else None,
                retry_count=0,
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
    delivery_map = {d.payslip_id: d for d in deliveries}

    sent_count = 0
    failed_count = 0
    pending_count = 0

    for d in deliveries:
        if d.status == EmailDeliveryStatus.SENT:
            sent_count += 1
        elif d.status == EmailDeliveryStatus.FAILED:
            failed_count += 1
        elif d.status == EmailDeliveryStatus.PENDING:
            pending_count += 1

    total_payslips = len(payrun.payslips)
    not_attempted_count = total_payslips - len(deliveries)
    can_retry = failed_count > 0 or not_attempted_count > 0

    # 3. Format items
    items: list[PayslipEmailDeliveryItem] = []
    # Build employee lookup
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
