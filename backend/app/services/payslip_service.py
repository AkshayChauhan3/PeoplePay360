"""
Payslip Service — PeoplePay360

Provides query operations for employee payslips and itemized line snapshots.
"""

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.employee import Employee
from app.models.payslip import Payslip, PayslipStatus
from app.models.payslip_line import PayslipLine
from app.schemas.payslip import PayslipLineResponse, PayslipResponse


def _payslip_query():
    """Base query eagerly loading relationships for Payslip."""
    return (
        select(Payslip)
        .options(
            selectinload(Payslip.employee),
            selectinload(Payslip.contract),
            selectinload(Payslip.salary_structure),
            selectinload(Payslip.lines),
            selectinload(Payslip.payrun),
        )
    )


def serialize_payslip_response(payslip: Payslip) -> PayslipResponse:
    """Helper to convert a Payslip ORM model to a PayslipResponse schema."""
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
        for line in payslip.lines
    ]

    emp_name = (
        f"{payslip.employee.first_name} {payslip.employee.last_name}"
        if payslip.employee
        else None
    )

    return PayslipResponse(
        id=payslip.id,
        payrun_id=payslip.payrun_id,
        employee_id=payslip.employee_id,
        employee_name=emp_name,
        contract_id=payslip.contract_id,
        salary_structure_id=payslip.salary_structure_id,
        period_start=payslip.period_start,
        period_end=payslip.period_end,
        status=payslip.status,
        worked_days=payslip.worked_days,
        gross_amount=payslip.gross_amount,
        deduction_amount=payslip.deduction_amount,
        net_amount=payslip.net_amount,
        lines=line_responses,
        created_at=payslip.created_at,
        updated_at=payslip.updated_at,
    )


async def get_payslip_by_id(db: AsyncSession, payslip_id: int) -> Payslip | None:
    """Retrieve an individual payslip by ID with relationships eagerly loaded."""
    query = _payslip_query().where(Payslip.id == payslip_id)
    result = await db.execute(query)
    return result.scalars().first()


async def list_payslips(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    payrun_id: int | None = None,
    employee_id: int | None = None,
    status_filter: PayslipStatus | None = None,
) -> tuple[list[Payslip], int]:
    """List payslips with filtering and pagination."""
    query = _payslip_query()
    count_query = select(func.count(Payslip.id))

    if payrun_id is not None:
        query = query.where(Payslip.payrun_id == payrun_id)
        count_query = count_query.where(Payslip.payrun_id == payrun_id)

    if employee_id is not None:
        query = query.where(Payslip.employee_id == employee_id)
        count_query = count_query.where(Payslip.employee_id == employee_id)

    if status_filter is not None:
        query = query.where(Payslip.status == status_filter)
        count_query = count_query.where(Payslip.status == status_filter)

    total_res = await db.execute(count_query)
    total = total_res.scalar_one()

    query = query.order_by(Payslip.id.desc()).offset(skip).limit(limit)
    res = await db.execute(query)
    items = list(res.scalars().all())

    return items, total


async def get_employee_payslips(
    db: AsyncSession,
    employee_id: int,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Payslip], int]:
    """Retrieve all payslips for an employee with pagination."""
    emp_res = await db.execute(select(Employee).where(Employee.id == employee_id))
    if not emp_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found.",
        )

    return await list_payslips(
        db=db,
        skip=skip,
        limit=limit,
        employee_id=employee_id,
    )

