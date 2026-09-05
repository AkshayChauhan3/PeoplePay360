"""
Payruns API Router — PeoplePay360

Manages the lifecycle of payroll batches:
- Preview wizard (Step 1)
- Creation (Step 2)
- State transitions (compute, validate, mark-paid, cancel, delete)
- Payslips nested retrieval
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies.auth import (
    get_current_user,
    require_payroll_manager,
    require_payroll_read,
)
from app.models.payrun import PayrunStatus
from app.models.payslip import PayslipStatus
from app.schemas.email_delivery import (
    EmailDeliverySummaryResponse,
    SendPayslipsRequest,
    SendPayslipsResponse,
)
from app.schemas.payout import BankPayoutSummaryResponse
from app.schemas.payrun import (
    PayrunCreate,
    PayrunListResponse,
    PayrunPreviewRequest,
    PayrunPreviewResponse,
    PayrunResponse,
)
from app.schemas.payslip import PayslipListResponse
from app.services import (
    email_delivery_service,
    payout_export_service,
    payrun_service,
    payslip_service,
)

router = APIRouter(prefix="/payruns", tags=["Payruns"])



@router.post(
    "/preview",
    response_model=PayrunPreviewResponse,
    summary="Wizard Step 1: Preview employee payroll eligibility",
)
async def preview_payrun(
    request: PayrunPreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_read()),
):
    """
    Step 1 of the Payrun Creation Wizard.
    Evaluates all employees against the specified salary structure and accounting date range.
    Returns categorized lists of eligible and ineligible employees with explanation reasons and audit warnings.
    """
    return await payrun_service.preview_payrun_wizard(db, request)


@router.post(
    "",
    response_model=PayrunResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Wizard Step 2: Create a new draft payrun",
)
async def create_payrun(
    data: PayrunCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_manager()),
):
    """
    Step 2 of the Payrun Creation Wizard.
    Instantiates a new Payrun in DRAFT state and generates initial DRAFT payslips for
    either the explicitly selected employees or all eligible employees.
    """
    payrun = await payrun_service.create_payrun(db, data, user_id=current_user.id)
    return payrun_service.serialize_payrun_response(payrun)


@router.get(
    "",
    response_model=PayrunListResponse,
    summary="List payruns",
)
async def list_payruns(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    status_filter: PayrunStatus | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_read()),
):
    """List payruns with optional status filtering and pagination."""
    items, total = await payrun_service.list_payruns(
        db, skip=skip, limit=limit, status_filter=status_filter
    )
    return PayrunListResponse(
        items=[payrun_service.serialize_payrun_response(p) for p in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{payrun_id}",
    response_model=PayrunResponse,
    summary="Get payrun details",
)
async def get_payrun(
    payrun_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_read()),
):
    """Retrieve full details of a specific payrun with nested payslips and financial totals."""
    payrun = await payrun_service.get_payrun_by_id(db, payrun_id)
    if not payrun:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payrun with ID {payrun_id} not found.",
        )
    return payrun_service.serialize_payrun_response(payrun)


@router.post(
    "/{payrun_id}/compute",
    response_model=PayrunResponse,
    summary="Compute all payslips in a payrun",
)
async def compute_payrun(
    payrun_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_manager()),
):
    """
    Executes the calculation engine across all draft payslips in the payrun batch.
    Pulls real-time attendance and approved leave data into calculation context,
    computes salary rules in sequence, and generates immutable PayslipLine records.
    Transitions status: DRAFT -> COMPUTED.
    """
    payrun = await payrun_service.compute_payrun(db, payrun_id)
    return payrun_service.serialize_payrun_response(payrun)


@router.post(
    "/{payrun_id}/validate",
    response_model=PayrunResponse,
    summary="Validate computed payrun",
)
async def validate_payrun(
    payrun_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_manager()),
):
    """
    Performs audit checks on all computed payslips.
    Blocks transition if negative net salary or non-running contracts exist.
    Transitions status: COMPUTED -> VALIDATED.
    """
    payrun, _, _ = await payrun_service.validate_payrun(db, payrun_id)
    return payrun_service.serialize_payrun_response(payrun)


@router.post(
    "/{payrun_id}/mark-paid",
    response_model=PayrunResponse,
    summary="Mark validated payrun as paid",
)
async def mark_payrun_paid(
    payrun_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_manager()),
):
    """
    Finalizes the financial settlement of the payrun and freezes all payslip line records.
    Transitions status: VALIDATED -> PAID.
    """
    payrun = await payrun_service.mark_payrun_paid(db, payrun_id)
    return payrun_service.serialize_payrun_response(payrun)


@router.post(
    "/{payrun_id}/cancel",
    response_model=PayrunResponse,
    summary="Cancel payrun",
)
async def cancel_payrun(
    payrun_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_manager()),
):
    """
    Cancels an active payrun (not allowed if already PAID).
    Transitions payrun and associated payslips to CANCELLED.
    """
    payrun = await payrun_service.cancel_payrun(db, payrun_id)
    return payrun_service.serialize_payrun_response(payrun)


@router.delete(
    "/{payrun_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete draft or cancelled payrun",
)
async def delete_payrun(
    payrun_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_manager()),
):
    """
    Permanently deletes a payrun and its associated draft payslips.
    Allowed strictly when payrun is in DRAFT or CANCELLED status.
    """
    await payrun_service.delete_payrun(db, payrun_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{payrun_id}/payslips",
    response_model=PayslipListResponse,
    summary="List payslips within a payrun",
)
async def list_payrun_payslips(
    payrun_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    status_filter: PayslipStatus | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_read()),
):
    """List all payslips belonging to a specific payrun batch."""
    payrun = await payrun_service.get_payrun_by_id(db, payrun_id)
    if not payrun:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payrun with ID {payrun_id} not found.",
        )
    items, total = await payslip_service.list_payslips(
        db=db,
        skip=skip,
        limit=limit,
        payrun_id=payrun_id,
        status_filter=status_filter,
    )
    return PayslipListResponse(
        items=[payslip_service.serialize_payslip_response(p) for p in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{payrun_id}/bank-payout-summary",
    response_model=BankPayoutSummaryResponse,
    summary="Audit payrun bank account readiness for payout",
)
async def get_payrun_bank_payout_summary(
    payrun_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_read()),
):
    """
    Returns an audit summary of bank account details for all employees in the payrun batch.
    Surfaces employees with missing bank accounts, IFSC codes, or bank names prior to export.
    """
    return await payout_export_service.get_bank_payout_summary(db, payrun_id)


@router.get(
    "/{payrun_id}/export-bank-file",
    summary="Export corporate bank payout batch file (CSV)",
)
async def export_payrun_bank_file(
    payrun_id: int,
    bank_format: str = Query(
        default="standard",
        pattern="^(standard|hdfc|icici)$",
        description="Target bank transfer format preset: 'standard', 'hdfc', or 'icici'",
    ),
    strict: bool = Query(
        default=False,
        description="If true, returns 422 if any employee is missing bank account or IFSC details",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_read()),
):
    """
    Downloads a structured, formatted bank payout batch file (CSV) for uploading
    directly to corporate banking portals (e.g. HDFC Enet, ICICI Corporate).
    Requires the payrun to be in COMPUTED, VALIDATED, or PAID state.
    """
    csv_content, filename = await payout_export_service.generate_bank_payout_csv(
        db, payrun_id, bank_format=bank_format, strict=strict
    )
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.post(
    "/{payrun_id}/send-payslips",
    response_model=SendPayslipsResponse,
    summary="Distribute PDF payslips via email to employees",
)
async def send_payrun_payslips(
    payrun_id: int,
    payload: SendPayslipsRequest = SendPayslipsRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_manager()),
):
    """
    Distributes individual ReportLab PDF payslips via email to all employees in the payrun batch.
    Requires payrun to be in VALIDATED or PAID state.
    Automatically skips employees who already have status SENT unless force_resend_all is True.
    """
    return await email_delivery_service.deliver_payrun_payslips(
        db=db,
        payrun_id=payrun_id,
        retry_failed_only=False,
        force_resend_all=payload.force_resend_all,
    )


@router.post(
    "/{payrun_id}/retry-failed-emails",
    response_model=SendPayslipsResponse,
    summary="Retry failed payslip email deliveries",
)
async def retry_failed_payrun_emails(
    payrun_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_manager()),
):
    """
    HR 'Retry Failed' Action: Re-attempts email delivery strictly for employees whose
    previous delivery status is FAILED. Skips already delivered recipients without double-spamming.
    """
    return await email_delivery_service.deliver_payrun_payslips(
        db=db,
        payrun_id=payrun_id,
        retry_failed_only=True,
        force_resend_all=False,
    )


@router.get(
    "/{payrun_id}/email-delivery-summary",
    response_model=EmailDeliverySummaryResponse,
    summary="Audit payrun email distribution metrics and logs",
)
async def get_payrun_email_delivery_summary(
    payrun_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_read()),
):
    """
    Returns real-time email delivery metrics (Total, Sent, Failed, Pending) and an itemized
    delivery audit log for each employee payslip in the payrun batch.
    """
    return await email_delivery_service.get_payrun_email_delivery_summary(db, payrun_id)



