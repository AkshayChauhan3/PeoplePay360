"""
Payrun Service — PeoplePay360

Handles payrun lifecycle operations:
- Preview wizard (Step 1)
- Payrun creation & payslip initialization (Step 2)
- State machine transitions (DRAFT -> COMPUTED -> VALIDATED -> PAID / CANCELLED)
- Payrun deletion safeguards
"""

from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.employee import Employee
from app.models.payrun import Payrun, PayrunStatus
from app.models.payslip import Payslip, PayslipStatus
from app.models.payslip_line import PayslipLine
from app.models.salary_structure import SalaryStructure
from app.schemas.payrun import (
    PayrollWarningItem,
    PayrunCreate,
    PayrunPreviewRequest,
    PayrunPreviewResponse,
    PayrunResponse,
)
from app.schemas.payslip import PayslipLineResponse, PayslipResponse
from app.services.payroll_processing_service import (
    audit_payrun_for_warnings,
    calculate_and_generate_payslip,
    check_employee_payroll_eligibility,
    preview_payroll_eligibility,
)


def _payrun_query():
    """Base query eagerly loading associated relationships for Payrun."""
    return (
        select(Payrun)
        .options(
            selectinload(Payrun.salary_structure).selectinload(SalaryStructure.rules),
            selectinload(Payrun.creator),
            selectinload(Payrun.payslips).selectinload(Payslip.employee),
            selectinload(Payrun.payslips).selectinload(Payslip.lines),
        )
    )


def serialize_payrun_response(payrun: Payrun) -> PayrunResponse:
    """Helper to convert a Payrun ORM model into PayrunResponse with financial summaries."""
    total_gross = Decimal("0.00")
    total_deduction = Decimal("0.00")
    total_net = Decimal("0.00")

    payslip_responses: list[PayslipResponse] = []
    for ps in payrun.payslips:
        total_gross += ps.gross_amount
        total_deduction += ps.deduction_amount
        total_net += ps.net_amount

        line_responses = [
            PayslipLineResponse(
                id=line.id,
                payslip_id=line.payslip_id,
                salary_rule_id=line.salary_rule_id,
                code=line.code,
                name=line.name,
                category=line.category,
                sequence=line.sequence,
                amount=line.amount,
                created_at=line.created_at,
            )
            for line in ps.lines
        ]

        emp_name = (
            f"{ps.employee.first_name} {ps.employee.last_name}"
            if ps.employee
            else None
        )

        payslip_responses.append(
            PayslipResponse(
                id=ps.id,
                payrun_id=ps.payrun_id,
                employee_id=ps.employee_id,
                employee_name=emp_name,
                contract_id=ps.contract_id,
                salary_structure_id=ps.salary_structure_id,
                period_start=ps.period_start,
                period_end=ps.period_end,
                status=ps.status,
                worked_days=ps.worked_days,
                gross_amount=ps.gross_amount,
                deduction_amount=ps.deduction_amount,
                net_amount=ps.net_amount,
                lines=line_responses,
                created_at=ps.created_at,
                updated_at=ps.updated_at,
            )
        )

    return PayrunResponse(
        id=payrun.id,
        name=payrun.name,
        salary_structure_id=payrun.salary_structure_id,
        salary_structure_name=payrun.salary_structure.name if payrun.salary_structure else None,
        period_start=payrun.period_start,
        period_end=payrun.period_end,
        status=payrun.status,
        created_by=payrun.created_by,
        payslip_count=len(payrun.payslips),
        total_gross=total_gross,
        total_deduction=total_deduction,
        total_net=total_net,
        payslips=payslip_responses,
        created_at=payrun.created_at,
        updated_at=payrun.updated_at,
    )


async def preview_payrun_wizard(
    db: AsyncSession,
    request: PayrunPreviewRequest,
) -> PayrunPreviewResponse:
    """Step 1: Wizard preview discovery."""
    try:
        return await preview_payroll_eligibility(
            db=db,
            salary_structure_id=request.salary_structure_id,
            period_start=request.period_start,
            period_end=request.period_end,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


async def create_payrun(
    db: AsyncSession,
    data: PayrunCreate,
    user_id: int | None = None,
) -> Payrun:
    """
    Step 2: Create a draft payrun with draft payslips for selected/eligible employees.
    """
    # 1. Validate structure exists and is active
    struct_res = await db.execute(
        select(SalaryStructure).where(SalaryStructure.id == data.salary_structure_id)
    )
    structure = struct_res.scalar_one_or_none()
    if not structure:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Salary Structure with ID {data.salary_structure_id} not found.",
        )
    if not structure.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Salary Structure '{structure.name}' is inactive.",
        )

    # 2. Determine target employees
    selected_items: list[tuple[Employee, int]] = []  # (Employee, contract_id)

    if data.employee_ids is not None and len(data.employee_ids) > 0:
        # User specified explicit list
        for emp_id in data.employee_ids:
            emp_res = await db.execute(select(Employee).where(Employee.id == emp_id))
            emp = emp_res.scalar_one_or_none()
            if not emp:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Employee with ID {emp_id} not found.",
                )
            is_elig, reason, contract = await check_employee_payroll_eligibility(
                db=db,
                employee=emp,
                period_start=data.period_start,
                period_end=data.period_end,
                expected_structure_id=data.salary_structure_id,
            )
            if not is_elig or not contract:
                emp_name = f"{emp.first_name} {emp.last_name}"
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Employee {emp_name} is ineligible: {reason}",
                )
            selected_items.append((emp, contract.id))
    else:
        # Include all eligible employees
        preview = await preview_payroll_eligibility(
            db=db,
            salary_structure_id=data.salary_structure_id,
            period_start=data.period_start,
            period_end=data.period_end,
        )
        if preview.total_eligible == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No eligible employees found for this salary structure and period.",
            )
        for item in preview.eligible_employees:
            emp_res = await db.execute(select(Employee).where(Employee.id == item.employee_id))
            emp = emp_res.scalar_one()
            selected_items.append((emp, item.contract_id))

    # 3. Create Payrun
    payrun = Payrun(
        name=data.name.strip(),
        salary_structure_id=data.salary_structure_id,
        period_start=data.period_start,
        period_end=data.period_end,
        status=PayrunStatus.DRAFT,
        created_by=user_id,
    )
    db.add(payrun)
    await db.flush()

    # 4. Create Draft Payslips
    for emp, contract_id in selected_items:
        payslip = Payslip(
            payrun_id=payrun.id,
            employee_id=emp.id,
            contract_id=contract_id,
            salary_structure_id=data.salary_structure_id,
            period_start=data.period_start,
            period_end=data.period_end,
            status=PayslipStatus.DRAFT,
            worked_days=Decimal("0.00"),
            gross_amount=Decimal("0.00"),
            deduction_amount=Decimal("0.00"),
            net_amount=Decimal("0.00"),
        )
        db.add(payslip)

    await db.commit()

    loaded = await get_payrun_by_id(db, payrun.id)
    return loaded  # type: ignore[return-value]


async def get_payrun_by_id(db: AsyncSession, payrun_id: int) -> Payrun | None:
    """Retrieve payrun by ID with eager relationships loaded."""
    result = await db.execute(_payrun_query().where(Payrun.id == payrun_id))
    return result.scalars().first()


async def list_payruns(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    status_filter: PayrunStatus | None = None,
) -> tuple[list[Payrun], int]:
    """List payruns with pagination and optional status filter."""
    query = _payrun_query()
    count_query = select(func.count(Payrun.id))

    if status_filter is not None:
        query = query.where(Payrun.status == status_filter)
        count_query = count_query.where(Payrun.status == status_filter)

    total_res = await db.execute(count_query)
    total = total_res.scalar_one()

    query = query.order_by(Payrun.id.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    items = list(res.scalars().all())

    return items, total


async def compute_payrun(db: AsyncSession, payrun_id: int) -> Payrun:
    """
    Compute all payslips in a payrun.
    Allowed from DRAFT or COMPUTED states.
    """
    payrun = await get_payrun_by_id(db, payrun_id)
    if not payrun:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payrun with ID {payrun_id} not found.",
        )

    if payrun.status not in (PayrunStatus.DRAFT, PayrunStatus.COMPUTED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot compute payrun in {payrun.status.value} status.",
        )

    # Load structure with rules
    struct_res = await db.execute(
        select(SalaryStructure)
        .options(selectinload(SalaryStructure.rules))
        .where(SalaryStructure.id == payrun.salary_structure_id)
    )
    structure = struct_res.scalar_one_or_none()
    if not structure:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Salary structure ID {payrun.salary_structure_id} no longer exists.",
        )

    # Compute each payslip
    for ps in payrun.payslips:
        await calculate_and_generate_payslip(db, ps, structure)

    payrun.status = PayrunStatus.COMPUTED
    await db.commit()

    return await get_payrun_by_id(db, payrun.id)  # type: ignore[return-value]


async def validate_payrun(
    db: AsyncSession,
    payrun_id: int,
) -> tuple[Payrun, list[PayrollWarningItem], list[PayrollWarningItem]]:
    """
    Validate a computed payrun.
    Fails if any blocking errors are detected.
    """
    payrun = await get_payrun_by_id(db, payrun_id)
    if not payrun:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payrun with ID {payrun_id} not found.",
        )

    if payrun.status != PayrunStatus.COMPUTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only COMPUTED payruns can be validated. Current status is {payrun.status.value}.",
        )

    errors, warnings = await audit_payrun_for_warnings(db, payrun)
    if len(errors) > 0:
        error_msgs = "; ".join([e.message for e in errors])
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation failed with blocking errors: {error_msgs}",
        )

    payrun.status = PayrunStatus.VALIDATED
    for ps in payrun.payslips:
        ps.status = PayslipStatus.VALIDATED

    await db.commit()
    updated = await get_payrun_by_id(db, payrun.id)
    return updated, errors, warnings  # type: ignore[return-value]


async def mark_payrun_paid(
    db: AsyncSession,
    payrun_id: int,
    auto_deliver_emails: bool | None = None,
) -> Payrun:
    """
    Transition payrun and its payslips from VALIDATED to PAID.
    Optionally triggers asynchronous payslip email distribution in background.
    """
    payrun = await get_payrun_by_id(db, payrun_id)
    if not payrun:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payrun with ID {payrun_id} not found.",
        )

    if payrun.status != PayrunStatus.VALIDATED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only VALIDATED payruns can be marked as PAID. Current status is {payrun.status.value}.",
        )

    payrun.status = PayrunStatus.PAID
    for ps in payrun.payslips:
        ps.status = PayslipStatus.PAID

    await db.commit()

    should_auto_email = (
        auto_deliver_emails
        if auto_deliver_emails is not None
        else settings.auto_email_on_payrun_paid
    )
    if should_auto_email:
        import asyncio
        from app.workers.email_worker import process_payrun_emails_job
        asyncio.create_task(process_payrun_emails_job(ctx=None, payrun_id=payrun.id))

    return await get_payrun_by_id(db, payrun.id)  # type: ignore[return-value]


async def cancel_payrun(db: AsyncSession, payrun_id: int) -> Payrun:
    """
    Cancel an active payrun (not allowed if already PAID).
    """
    payrun = await get_payrun_by_id(db, payrun_id)
    if not payrun:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payrun with ID {payrun_id} not found.",
        )

    if payrun.status == PayrunStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Paid payruns cannot be cancelled.",
        )

    payrun.status = PayrunStatus.CANCELLED
    for ps in payrun.payslips:
        ps.status = PayslipStatus.CANCELLED

    await db.commit()
    return await get_payrun_by_id(db, payrun.id)  # type: ignore[return-value]


async def delete_payrun(db: AsyncSession, payrun_id: int) -> None:
    """
    Delete a payrun.
    Allowed only in DRAFT or CANCELLED status.
    """
    payrun = await get_payrun_by_id(db, payrun_id)
    if not payrun:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payrun with ID {payrun_id} not found.",
        )

    if payrun.status not in (PayrunStatus.DRAFT, PayrunStatus.CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete payrun in {payrun.status.value} status. Only DRAFT or CANCELLED allowed.",
        )

    await db.delete(payrun)
    await db.commit()

