"""
Payslips API Router — PeoplePay360

Endpoints for querying employee payslips and itemized salary rule lines:
- GET /api/v1/payslips       (Payroll User, Payroll Manager, Admin)
- GET /api/v1/payslips/{id}  (Payroll User/Manager/Admin, or the owner Employee)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies.auth import (
    get_current_user,
    require_payroll_manager,
    require_payroll_read,
)
from app.models.payslip import PayslipStatus
from app.models.user import User, UserRole
from app.schemas.email_delivery import (
    PayslipEmailDeliveryDetailResponse,
    SinglePayslipEmailResponse,
)
from app.schemas.payslip import PayslipListResponse, PayslipResponse
from app.services import email_delivery_service, payslip_service, pdf_service


router = APIRouter(prefix="/payslips", tags=["Payslips"])

_PAYROLL_ROLES = {
    UserRole.ADMIN.value,
    UserRole.HR_PAYROLL_MANAGER.value,
    UserRole.HR_PAYROLL_USER.value,
}


@router.get(
    "",
    response_model=PayslipListResponse,
    summary="List all payslips",
)
async def list_payslips(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    payrun_id: int | None = Query(default=None),
    employee_id: int | None = Query(default=None),
    status_filter: PayslipStatus | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_read()),
):
    """
    List payslips across all payruns with multi-parameter filtering.
    Restricted to Payroll Users, Payroll Managers, and Administrators.
    """
    items, total = await payslip_service.list_payslips(
        db=db,
        skip=skip,
        limit=limit,
        payrun_id=payrun_id,
        employee_id=employee_id,
        status_filter=status_filter,
    )
    return PayslipListResponse(
        items=[payslip_service.serialize_payslip_response(p) for p in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{payslip_id}",
    response_model=PayslipResponse,
    summary="Get payslip by ID",
)
async def get_payslip(
    payslip_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve full details of a specific payslip including itemized calculation lines.
    Permitted for Payroll staff/Admin, or the individual employee whose salary statement this is.
    """
    payslip = await payslip_service.get_payslip_by_id(db, payslip_id)
    if not payslip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payslip with ID {payslip_id} not found.",
        )

    # Authorization logic
    is_payroll_staff = current_user.role_name in _PAYROLL_ROLES
    is_owner_employee = (
        current_user.employee_id is not None
        and current_user.employee_id == payslip.employee_id
    )

    if not is_payroll_staff and not is_owner_employee:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this payslip.",
        )

    return payslip_service.serialize_payslip_response(payslip)


@router.get(
    "/{payslip_id}/pdf",
    summary="Download payslip as PDF",
)
async def download_payslip_pdf(
    payslip_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generates and streams a professional ReportLab PDF salary statement.
    Authorized for Payroll staff/Admin, or the owner employee.
    """
    payslip = await payslip_service.get_payslip_by_id(db, payslip_id)
    if not payslip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payslip with ID {payslip_id} not found.",
        )

    # Authorization logic
    is_payroll_staff = current_user.role_name in _PAYROLL_ROLES
    is_owner_employee = (
        current_user.employee_id is not None
        and current_user.employee_id == payslip.employee_id
    )

    if not is_payroll_staff and not is_owner_employee:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this payslip.",
        )

    pdf_bytes = pdf_service.generate_payslip_pdf(payslip)
    filename = f"payslip_{payslip.employee_id}_{payslip.period_start}_{payslip.period_end}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
        },
    )


@router.post(
    "/{payslip_id}/send-email",
    response_model=SinglePayslipEmailResponse,
    summary="Email individual payslip to employee",
)
async def send_individual_payslip_email(
    payslip_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_manager()),
):
    """
    Generates and emails an individual employee's ReportLab PDF payslip.
    Restricted to HR Payroll Managers and Administrators.
    Requires the associated payrun to be in VALIDATED or PAID state.
    """
    return await email_delivery_service.send_single_payslip_email(db, payslip_id)


@router.get(
    "/{payslip_id}/email-delivery",
    response_model=PayslipEmailDeliveryDetailResponse,
    summary="Get individual payslip email delivery status",
)
async def get_payslip_email_delivery_status(
    payslip_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve email delivery status, attempt counts, and error details for a payslip.
    Authorized for Payroll staff/Admin, or the owner employee.
    """
    payslip = await payslip_service.get_payslip_by_id(db, payslip_id)
    if not payslip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payslip with ID {payslip_id} not found.",
        )

    is_payroll_staff = current_user.role_name in _PAYROLL_ROLES
    is_owner_employee = (
        current_user.employee_id is not None
        and current_user.employee_id == payslip.employee_id
    )

    if not is_payroll_staff and not is_owner_employee:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this delivery record.",
        )

    return await email_delivery_service.get_single_payslip_email_delivery(db, payslip_id)



