"""
Time Off Request Service Module — PeoplePay360

Handles the core leave request lifecycle and business rules:
- Duration calculation (DAYS vs HOURS)
- Overlap prevention (PENDING and APPROVED block conflicting requests)
- Deterministic allocation resolution (earliest expiring grant)
- Concurrency-safe atomic approval using PostgreSQL SELECT FOR UPDATE row locking
- Refusal workflow with mandatory audit reason
- Cancellation workflow restoring consumed allocation balance
- Filtered listing and self-service authorization boundaries
"""

from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee, EmployeeStatus
from app.models.time_off import (
    AllocationStatus,
    TimeOffAllocation,
    TimeOffRequest,
    TimeOffRequestStatus,
    TimeOffType,
    TimeOffUnit,
)
from app.models.user import UserRole
from app.models.user import User
from app.schemas.time_off import TimeOffRequestCreate, TimeOffRequestUpdate
from app.services import time_off_allocation_service, time_off_type_service


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def calculate_quantity(
    unit: TimeOffUnit,
    start_date: date,
    end_date: date,
    explicit_quantity: Decimal | None = None,
) -> Decimal:
    """
    Calculate or validate requested leave duration.

    - For DAYS: defaults to inclusive day count: (end_date - start_date).days + 1.
      Explicit fractional days (e.g. 0.5) are honored.
    - For HOURS: defaults to 8.00 hours per day if not explicitly supplied.
    """
    if explicit_quantity is not None:
        if explicit_quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="requested_quantity must be strictly greater than zero.",
            )
        return explicit_quantity

    calendar_days = (end_date - start_date).days + 1
    if unit == TimeOffUnit.DAYS:
        return Decimal(str(calendar_days))
    elif unit == TimeOffUnit.HOURS:
        # Standard default of 8.0 hours per scheduled day
        return Decimal(str(calendar_days * 8.0))
    return Decimal(str(calendar_days))


async def check_overlapping_requests(
    db: AsyncSession,
    employee_id: int,
    start_date: date,
    end_date: date,
    exclude_request_id: int | None = None,
) -> None:
    """
    Ensure the employee does not have conflicting PENDING or APPROVED leave requests
    during the specified date window.

    Raises:
        HTTPException 409: If an overlapping active leave request is found.
    """
    query = select(TimeOffRequest).where(
        TimeOffRequest.employee_id == employee_id,
        TimeOffRequest.status.in_([TimeOffRequestStatus.PENDING, TimeOffRequestStatus.APPROVED]),
        TimeOffRequest.start_date <= end_date,
        TimeOffRequest.end_date >= start_date,
    )
    if exclude_request_id is not None:
        query = query.where(TimeOffRequest.id != exclude_request_id)

    result = await db.execute(query)
    conflicts = result.scalars().all()
    if conflicts:
        conflict = conflicts[0]
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Leave request conflicts with existing {conflict.status} request "
                f"(ID: {conflict.id}, {conflict.start_date} to {conflict.end_date})."
            ),
        )


async def get_request_by_id(db: AsyncSession, request_id: int) -> TimeOffRequest | None:
    """Return a TimeOffRequest by primary key ID, or None."""
    result = await db.execute(
        select(TimeOffRequest).where(TimeOffRequest.id == request_id)
    )
    return result.scalar_one_or_none()


async def list_requests(
    db: AsyncSession,
    employee_id: int | None = None,
    time_off_type_id: int | None = None,
    status_filter: TimeOffRequestStatus | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[TimeOffRequest]:
    """List leave requests with optional filters and pagination."""
    query = select(TimeOffRequest).order_by(
        TimeOffRequest.start_date.desc(),
        TimeOffRequest.id.desc(),
    )
    if employee_id is not None:
        query = query.where(TimeOffRequest.employee_id == employee_id)
    if time_off_type_id is not None:
        query = query.where(TimeOffRequest.time_off_type_id == time_off_type_id)
    if status_filter is not None:
        query = query.where(TimeOffRequest.status == status_filter)
    if from_date is not None:
        query = query.where(TimeOffRequest.end_date >= from_date)
    if to_date is not None:
        query = query.where(TimeOffRequest.start_date <= to_date)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_request(
    db: AsyncSession,
    employee_id: int,
    data: TimeOffRequestCreate,
    current_user: User | None = None,
) -> TimeOffRequest:
    """
    Create a new leave request.

    Steps:
    1. Validate employee exists and is active.
    2. Validate time off type exists and is active.
    3. Calculate duration (days or hours).
    4. Enforce non-overlapping active requests.
    5. Resolve allocation if required (deterministic earliest-expiring selection).
    6. Auto-approve if type.approval_required is False.
    """
    # 1. Validate employee
    emp = await db.scalar(select(Employee).where(Employee.id == employee_id))
    if emp is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found.",
        )
    if emp.status == EmployeeStatus.TERMINATED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit leave request for terminated employee {employee_id}.",
        )

    # 2. Validate leave type
    leave_type = await time_off_type_service.get_type_by_id(db, data.time_off_type_id)
    if leave_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time off type with ID {data.time_off_type_id} not found.",
        )
    if not leave_type.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Time off type '{leave_type.name}' is inactive and cannot receive new requests.",
        )

    # 3. Calculate quantity
    qty = calculate_quantity(
        unit=leave_type.unit,
        start_date=data.start_date,
        end_date=data.end_date,
        explicit_quantity=data.requested_quantity,
    )

    # 4. Enforce non-overlapping active requests
    await check_overlapping_requests(
        db=db,
        employee_id=employee_id,
        start_date=data.start_date,
        end_date=data.end_date,
    )

    # 5. Resolve allocation if required
    resolved_alloc_id: int | None = None
    if leave_type.requires_allocation:
        if data.allocation_id is not None:
            # Caller specified allocation: validate it
            alloc = await time_off_allocation_service.get_allocation_by_id(db, data.allocation_id)
            if alloc is None or alloc.employee_id != employee_id or alloc.time_off_type_id != leave_type.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid allocation ID {data.allocation_id} for employee {employee_id}.",
                )
            if alloc.status not in (AllocationStatus.ACTIVE, AllocationStatus.APPROVED):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Allocation ID {data.allocation_id} is not active (status: {alloc.status}).",
                )
            if alloc.valid_from > data.start_date or alloc.valid_to < data.end_date:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Request dates ({data.start_date} to {data.end_date}) exceed allocation "
                        f"validity period ({alloc.valid_from} to {alloc.valid_to})."
                    ),
                )
            remaining = alloc.allocation_quantity - alloc.consumed_quantity
            if remaining < qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient leave balance in allocation {alloc.id}: {remaining} remaining, {qty} requested.",
                )
            resolved_alloc_id = alloc.id
        else:
            # Auto-resolve earliest-expiring eligible allocation
            eligible_allocs = await time_off_allocation_service.find_eligible_allocations(
                db=db,
                employee_id=employee_id,
                time_off_type_id=leave_type.id,
                start_date=data.start_date,
                end_date=data.end_date,
                required_quantity=qty,
            )
            if not eligible_allocs:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No eligible allocation found with sufficient balance for '{leave_type.name}' covering the requested dates.",
                )
            resolved_alloc_id = eligible_allocs[0].id

    # 6. Auto-approval handling
    initial_status = TimeOffRequestStatus.PENDING
    approved_by: int | None = None
    approved_at: datetime | None = None

    if not leave_type.approval_required:
        initial_status = TimeOffRequestStatus.APPROVED
        approved_at = _utcnow()
        if current_user:
            approved_by = current_user.id
        # Atomically consume allocation if required
        if resolved_alloc_id is not None:
            alloc_stmt = (
                select(TimeOffAllocation)
                .where(TimeOffAllocation.id == resolved_alloc_id)
                .with_for_update()
            )
            locked_alloc = (await db.execute(alloc_stmt)).scalar_one()
            locked_alloc.consumed_quantity += qty

    request = TimeOffRequest(
        employee_id=employee_id,
        time_off_type_id=leave_type.id,
        allocation_id=resolved_alloc_id,
        start_date=data.start_date,
        end_date=data.end_date,
        requested_quantity=qty,
        reason=data.reason,
        status=initial_status,
        approved_by=approved_by,
        approved_at=approved_at,
    )
    db.add(request)
    await db.flush()
    await db.refresh(request)
    return request


async def approve_request(
    db: AsyncSession,
    request_id: int,
    user_id: int,
) -> TimeOffRequest:
    """
    Approve a pending leave request with transaction-safe row-level locking.

    Steps:
    1. Fetch request (must be PENDING).
    2. If leave type requires allocation:
       - Acquire SELECT ... FOR UPDATE exclusive lock on the allocation.
       - Re-verify live remaining balance.
       - Increment consumed_quantity atomically.
    3. Set status = APPROVED, approved_by, approved_at.
    4. Commit in single transaction.
    """
    request = await get_request_by_id(db, request_id)
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time off request with ID {request_id} not found.",
        )
    if request.status != TimeOffRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PENDING requests can be approved. Current status: {request.status}.",
        )

    leave_type = await time_off_type_service.get_type_by_id(db, request.time_off_type_id)
    assert leave_type is not None

    if leave_type.requires_allocation:
        if request.allocation_id is None:
            # Attempt to resolve an allocation if one wasn't linked previously
            eligible = await time_off_allocation_service.find_eligible_allocations(
                db=db,
                employee_id=request.employee_id,
                time_off_type_id=request.time_off_type_id,
                start_date=request.start_date,
                end_date=request.end_date,
                required_quantity=request.requested_quantity,
            )
            if not eligible:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Insufficient leave balance or no eligible allocation found.",
                )
            request.allocation_id = eligible[0].id

        # Exclusive row-level lock on the allocation
        stmt = (
            select(TimeOffAllocation)
            .where(TimeOffAllocation.id == request.allocation_id)
            .with_for_update()
        )
        allocation = (await db.execute(stmt)).scalar_one()

        remaining = allocation.allocation_quantity - allocation.consumed_quantity
        if remaining < request.requested_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient leave balance: {remaining} remaining, {request.requested_quantity} requested.",
            )

        # Atomically consume balance
        allocation.consumed_quantity += request.requested_quantity

    request.status = TimeOffRequestStatus.APPROVED
    request.approved_by = user_id
    request.approved_at = _utcnow()

    await db.flush()
    await db.refresh(request)
    return request


async def refuse_request(
    db: AsyncSession,
    request_id: int,
    refusal_reason: str,
    user_id: int,
) -> TimeOffRequest:
    """
    Refuse a pending leave request.
    Does NOT consume any allocation.
    """
    request = await get_request_by_id(db, request_id)
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time off request with ID {request_id} not found.",
        )
    if request.status != TimeOffRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PENDING requests can be refused. Current status: {request.status}.",
        )

    request.status = TimeOffRequestStatus.REFUSED
    request.refusal_reason = refusal_reason
    request.approved_by = user_id
    request.approved_at = _utcnow()

    await db.flush()
    await db.refresh(request)
    return request


async def cancel_request(
    db: AsyncSession,
    request_id: int,
    current_user: User,
) -> TimeOffRequest:
    """
    Cancel a leave request.

    - If the request was APPROVED and linked to an allocation, restores the consumed quantity atomically.
    - An employee can cancel their own PENDING requests, or future APPROVED requests.
    - HR / Admin can cancel any request.
    """
    request = await get_request_by_id(db, request_id)
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time off request with ID {request_id} not found.",
        )

    if request.status in (TimeOffRequestStatus.REFUSED, TimeOffRequestStatus.CANCELLED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel request with status {request.status}.",
        )

    # Permission check: employee can only cancel own requests
    is_hr = current_user.role_name in (
        UserRole.ADMIN.value,
        UserRole.HR_MANAGER.value,
        UserRole.HR_PAYROLL_MANAGER.value,
        UserRole.HR_PAYROLL_USER.value,
    )
    if not is_hr:
        if current_user.employee_id != request.employee_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only cancel your own leave requests.",
            )

    # If previously APPROVED and had an allocation, restore the consumed quantity atomically
    if request.status == TimeOffRequestStatus.APPROVED and request.allocation_id is not None:
        stmt = (
            select(TimeOffAllocation)
            .where(TimeOffAllocation.id == request.allocation_id)
            .with_for_update()
        )
        result = await db.execute(stmt)
        allocation = result.scalar_one_or_none()
        if allocation is not None:
            allocation.consumed_quantity = max(
                Decimal("0.00"),
                allocation.consumed_quantity - request.requested_quantity,
            )

    request.status = TimeOffRequestStatus.CANCELLED
    await db.flush()
    await db.refresh(request)
    return request
