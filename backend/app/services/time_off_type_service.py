"""
Time Off Type Service Module — PeoplePay360

Handles business logic for leave types (configurable master data):
- Type creation with unique name/code validation
- Lookups by ID and uppercase code
- Listing (active vs all)
- Partial updates (PATCH) with duplicate validation
- Guarded soft-deactivation (rejects deactivation if pending leave requests exist)
"""

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.time_off import TimeOffRequest, TimeOffRequestStatus, TimeOffType
from app.schemas.time_off import TimeOffTypeCreate, TimeOffTypeUpdate


async def get_type_by_id(db: AsyncSession, type_id: int) -> TimeOffType | None:
    """Return a TimeOffType by primary key ID, or None."""
    result = await db.execute(select(TimeOffType).where(TimeOffType.id == type_id))
    return result.scalar_one_or_none()


async def get_type_by_code(db: AsyncSession, code: str) -> TimeOffType | None:
    """Return a TimeOffType by its unique code (case-insensitive), or None."""
    result = await db.execute(select(TimeOffType).where(TimeOffType.code == code.upper()))
    return result.scalar_one_or_none()


async def get_type_by_name(db: AsyncSession, name: str) -> TimeOffType | None:
    """Return a TimeOffType by its exact name, or None."""
    result = await db.execute(select(TimeOffType).where(TimeOffType.name == name))
    return result.scalar_one_or_none()


async def list_types(db: AsyncSession, include_inactive: bool = False) -> list[TimeOffType]:
    """
    Return all leave types, optionally including inactive ones.
    Ordered by ID ascending.
    """
    query = select(TimeOffType).order_by(TimeOffType.id)
    if not include_inactive:
        query = query.where(TimeOffType.is_active == True)  # noqa: E712
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_type(db: AsyncSession, data: TimeOffTypeCreate) -> TimeOffType:
    """
    Create a new TimeOffType with uniqueness checks on name and code.

    Raises:
        HTTPException 409: If name or code is already in use.
    """
    if await get_type_by_code(db, data.code) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Time off type with code '{data.code}' already exists.",
        )
    if await get_type_by_name(db, data.name) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Time off type with name '{data.name}' already exists.",
        )

    leave_type = TimeOffType(
        name=data.name,
        code=data.code,
        description=data.description,
        unit=data.unit,
        requires_allocation=data.requires_allocation,
        approval_required=data.approval_required,
        payroll_integration=data.payroll_integration,
        is_active=data.is_active,
    )
    db.add(leave_type)
    await db.flush()
    await db.refresh(leave_type)
    return leave_type


async def update_type(db: AsyncSession, type_id: int, data: TimeOffTypeUpdate) -> TimeOffType:
    """
    Partial update of a TimeOffType.

    Raises:
        HTTPException 404: If leave type does not exist.
        HTTPException 409: If proposed name or code is already taken.
    """
    leave_type = await get_type_by_id(db, type_id)
    if leave_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time off type with ID {type_id} not found.",
        )

    if data.code is not None and data.code != leave_type.code:
        existing = await get_type_by_code(db, data.code)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Time off type with code '{data.code}' already exists.",
            )
        leave_type.code = data.code

    if data.name is not None and data.name != leave_type.name:
        existing = await get_type_by_name(db, data.name)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Time off type with name '{data.name}' already exists.",
            )
        leave_type.name = data.name

    if data.description is not None:
        leave_type.description = data.description
    if data.unit is not None:
        leave_type.unit = data.unit
    if data.requires_allocation is not None:
        leave_type.requires_allocation = data.requires_allocation
    if data.approval_required is not None:
        leave_type.approval_required = data.approval_required
    if data.payroll_integration is not None:
        leave_type.payroll_integration = data.payroll_integration
    if data.is_active is not None:
        leave_type.is_active = data.is_active

    await db.flush()
    await db.refresh(leave_type)
    return leave_type


async def deactivate_type(db: AsyncSession, type_id: int) -> TimeOffType:
    """
    Soft-deactivate a TimeOffType.
    Rejects if there are any pending leave requests referencing this type.

    Raises:
        HTTPException 404: If leave type not found.
        HTTPException 400: If pending requests reference this type.
    """
    leave_type = await get_type_by_id(db, type_id)
    if leave_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time off type with ID {type_id} not found.",
        )

    # Check for pending requests
    pending_count = await db.scalar(
        select(func.count(TimeOffRequest.id)).where(
            TimeOffRequest.time_off_type_id == type_id,
            TimeOffRequest.status == TimeOffRequestStatus.PENDING,
        )
    )
    if pending_count and pending_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot deactivate time off type with {pending_count} pending request(s).",
        )

    leave_type.is_active = False
    await db.flush()
    await db.refresh(leave_type)
    return leave_type

