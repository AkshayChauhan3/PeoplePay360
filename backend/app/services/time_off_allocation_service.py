"""
Time Off Allocation Service Module — PeoplePay360

Handles business logic for leave allocations (grants):
- Allocation creation with date validity and positive quantity validation
- Lookups and filtered listing
- Partial updates with consumed quantity protection
- Cancellation of unused allocations
- Deterministic eligible allocation lookup (earliest-expiring active grant)
- Employee balance calculation across all active leave types
"""

from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee, EmployeeStatus
from app.models.time_off import (
    AllocationStatus,
    TimeOffAllocation,
    TimeOffType,
)
from app.schemas.time_off import (
    TimeOffAllocationCreate,
    TimeOffAllocationResponse,
    TimeOffAllocationUpdate,
    TimeOffBalanceItem,
    TimeOffBalanceResponse,
)
from app.services import time_off_type_service


async def get_allocation_by_id(db: AsyncSession, alloc_id: int) -> TimeOffAllocation | None:
    """Return a TimeOffAllocation by ID, or None."""
    result = await db.execute(
        select(TimeOffAllocation).where(TimeOffAllocation.id == alloc_id)
    )
    return result.scalar_one_or_none()


async def list_allocations(
    db: AsyncSession,
    employee_id: int | None = None,
    time_off_type_id: int | None = None,
    status_filter: AllocationStatus | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[TimeOffAllocation]:
    """
    List leave allocations with optional filters.
    Ordered by valid_from descending, id descending.
    """
    query = select(TimeOffAllocation).order_by(
        TimeOffAllocation.valid_from.desc(),
        TimeOffAllocation.id.desc(),
    )
    if employee_id is not None:
        query = query.where(TimeOffAllocation.employee_id == employee_id)
    if time_off_type_id is not None:
        query = query.where(TimeOffAllocation.time_off_type_id == time_off_type_id)
    if status_filter is not None:
        query = query.where(TimeOffAllocation.status == status_filter)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_allocation(
    db: AsyncSession,
    data: TimeOffAllocationCreate,
) -> TimeOffAllocation:
    """
    Create and persist a new leave allocation grant.

    Validations:
    1. Employee must exist and not be terminated.
    2. Leave type must exist and be active.
    3. Leave type must require allocations.
    4. valid_to >= valid_from.
    5. allocation_quantity > 0.

    Raises:
        HTTPException 404: If employee or leave type not found.
        HTTPException 400: If employee terminated, type inactive, or invalid parameters.
    """
    # 1. Validate employee
    emp = await db.scalar(select(Employee).where(Employee.id == data.employee_id))
    if emp is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {data.employee_id} not found.",
        )
    if emp.status == EmployeeStatus.TERMINATED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot grant leave allocation to terminated employee {data.employee_id}.",
        )

    # 2. Validate time off type
    leave_type = await time_off_type_service.get_type_by_id(db, data.time_off_type_id)
    if leave_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time off type with ID {data.time_off_type_id} not found.",
        )
    if not leave_type.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Time off type '{leave_type.name}' is inactive.",
        )
    if not leave_type.requires_allocation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Time off type '{leave_type.name}' does not require allocations.",
        )

    # 3. Validate dates
    if data.valid_to < data.valid_from:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="valid_to cannot be earlier than valid_from.",
        )

    allocation = TimeOffAllocation(
        employee_id=data.employee_id,
        time_off_type_id=data.time_off_type_id,
        allocation_quantity=data.allocation_quantity,
        consumed_quantity=Decimal("0.00"),
        valid_from=data.valid_from,
        valid_to=data.valid_to,
        status=AllocationStatus.ACTIVE,
        notes=data.notes,
    )
    db.add(allocation)
    await db.flush()
    await db.refresh(allocation)
    return allocation


async def update_allocation(
    db: AsyncSession,
    alloc_id: int,
    data: TimeOffAllocationUpdate,
) -> TimeOffAllocation:
    """
    Partial update of an allocation grant.

    Ensures allocation_quantity cannot be reduced below already consumed quantity.
    """
    allocation = await get_allocation_by_id(db, alloc_id)
    if allocation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time off allocation with ID {alloc_id} not found.",
        )

    if data.allocation_quantity is not None:
        if data.allocation_quantity < allocation.consumed_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot reduce allocation to {data.allocation_quantity} "
                    f"because {allocation.consumed_quantity} has already been consumed."
                ),
            )
        allocation.allocation_quantity = data.allocation_quantity

    effective_from = data.valid_from if data.valid_from is not None else allocation.valid_from
    effective_to = data.valid_to if data.valid_to is not None else allocation.valid_to
    if effective_to < effective_from:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="valid_to cannot be earlier than valid_from.",
        )

    if data.valid_from is not None:
        allocation.valid_from = data.valid_from
    if data.valid_to is not None:
        allocation.valid_to = data.valid_to
    if data.status is not None:
        allocation.status = data.status
    if data.notes is not None:
        allocation.notes = data.notes

    await db.flush()
    await db.refresh(allocation)
    return allocation


async def cancel_allocation(db: AsyncSession, alloc_id: int) -> TimeOffAllocation:
    """
    Cancel an allocation grant.
    Rejects if any quantity has already been consumed.
    """
    allocation = await get_allocation_by_id(db, alloc_id)
    if allocation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time off allocation with ID {alloc_id} not found.",
        )
    if allocation.consumed_quantity > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Cannot cancel allocation with ID {alloc_id} "
                f"because {allocation.consumed_quantity} has already been consumed."
            ),
        )

    allocation.status = AllocationStatus.CANCELLED
    await db.flush()
    await db.refresh(allocation)
    return allocation


async def find_eligible_allocations(
    db: AsyncSession,
    employee_id: int,
    time_off_type_id: int,
    start_date: date,
    end_date: date,
    required_quantity: Decimal,
) -> list[TimeOffAllocation]:
    """
    Find active allocations for the employee that cover the request window
    and have remaining balance >= required_quantity.

    Deterministic ordering: sorted by valid_to ascending (earliest expiring first),
    then by ID ascending.
    """
    query = (
        select(TimeOffAllocation)
        .where(
            TimeOffAllocation.employee_id == employee_id,
            TimeOffAllocation.time_off_type_id == time_off_type_id,
            TimeOffAllocation.status.in_([AllocationStatus.ACTIVE, AllocationStatus.APPROVED]),
            TimeOffAllocation.valid_from <= start_date,
            TimeOffAllocation.valid_to >= end_date,
            (TimeOffAllocation.allocation_quantity - TimeOffAllocation.consumed_quantity) >= required_quantity,
        )
        .order_by(TimeOffAllocation.valid_to.asc(), TimeOffAllocation.id.asc())
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_employee_balances(
    db: AsyncSession,
    employee_id: int,
) -> TimeOffBalanceResponse:
    """
    Calculate and aggregate leave balances for an employee across all active leave types.
    """
    emp = await db.scalar(select(Employee).where(Employee.id == employee_id))
    if emp is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found.",
        )

    # Get all active time off types
    types_query = select(TimeOffType).where(TimeOffType.is_active == True).order_by(TimeOffType.id)  # noqa: E712
    types_result = await db.execute(types_query)
    leave_types = list(types_result.scalars().all())

    # Get all non-cancelled allocations for the employee
    allocs_query = (
        select(TimeOffAllocation)
        .where(
            TimeOffAllocation.employee_id == employee_id,
            TimeOffAllocation.status != AllocationStatus.CANCELLED,
        )
        .order_by(TimeOffAllocation.valid_to.asc())
    )
    allocs_result = await db.execute(allocs_query)
    all_allocations = list(allocs_result.scalars().all())

    balance_items: list[TimeOffBalanceItem] = []
    for lt in leave_types:
        lt_allocs = [a for a in all_allocations if a.time_off_type_id == lt.id]
        total_allocated = sum((float(a.allocation_quantity) for a in lt_allocs), 0.0)
        total_consumed = sum((float(a.consumed_quantity) for a in lt_allocs), 0.0)
        total_remaining = max(0.0, total_allocated - total_consumed)

        balance_items.append(
            TimeOffBalanceItem(
                time_off_type_id=lt.id,
                time_off_type_name=lt.name,
                time_off_type_code=lt.code,
                unit=lt.unit,
                requires_allocation=lt.requires_allocation,
                total_allocated=round(total_allocated, 2),
                total_consumed=round(total_consumed, 2),
                total_remaining=round(total_remaining, 2),
                allocations=[
                    TimeOffAllocationResponse.model_validate(a)
                    for a in lt_allocs
                ],
            )
        )

    return TimeOffBalanceResponse(
        employee_id=employee_id,
        balances=balance_items,
    )

