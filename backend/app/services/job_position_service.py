from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee, EmployeeStatus
from app.models.job_position import JobPosition
from app.schemas.job_position import JobPositionCreate, JobPositionUpdate


async def get_job_positions(db: AsyncSession, include_inactive: bool = False) -> list[JobPosition]:
    """Return all job positions, optionally including inactive ones."""
    query = select(JobPosition).order_by(JobPosition.id)
    if not include_inactive:
        query = query.where(JobPosition.is_active == True)  # noqa: E712
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_job_position_by_id(db: AsyncSession, pos_id: int) -> JobPosition | None:
    """Return a job position by its ID, or None."""
    result = await db.execute(select(JobPosition).where(JobPosition.id == pos_id))
    return result.scalar_one_or_none()


async def get_job_position_by_code(db: AsyncSession, code: str) -> JobPosition | None:
    """Return a job position by its unique code, or None."""
    result = await db.execute(select(JobPosition).where(JobPosition.code == code.upper()))
    return result.scalar_one_or_none()


async def get_job_position_by_name(db: AsyncSession, name: str) -> JobPosition | None:
    """Return a job position by its unique name, or None."""
    result = await db.execute(select(JobPosition).where(JobPosition.name == name))
    return result.scalar_one_or_none()


async def create_job_position(db: AsyncSession, data: JobPositionCreate) -> JobPosition:
    """Create a new job position, checking unique name and code."""
    if await get_job_position_by_code(db, data.code) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job position with code '{data.code}' already exists.",
        )
    if await get_job_position_by_name(db, data.name) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Job position with name '{data.name}' already exists.",
        )

    pos = JobPosition(
        name=data.name,
        code=data.code,
        description=data.description,
        is_active=True,
    )
    db.add(pos)
    await db.flush()
    await db.commit()
    await db.refresh(pos)
    return pos


async def update_job_position(db: AsyncSession, pos_id: int, data: JobPositionUpdate) -> JobPosition:
    """Update job position fields, raising 404 if not found or 409 on unique conflict."""
    pos = await get_job_position_by_id(db, pos_id)
    if pos is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job position with ID {pos_id} not found.",
        )

    if data.code is not None and data.code != pos.code:
        existing = await get_job_position_by_code(db, data.code)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Job position with code '{data.code}' already exists.",
            )
        pos.code = data.code

    if data.name is not None and data.name != pos.name:
        existing = await get_job_position_by_name(db, data.name)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Job position with name '{data.name}' already exists.",
            )
        pos.name = data.name

    if data.description is not None:
        pos.description = data.description
    if data.is_active is not None:
        pos.is_active = data.is_active

    await db.flush()
    await db.commit()
    await db.refresh(pos)
    return pos


async def deactivate_job_position(db: AsyncSession, pos_id: int) -> JobPosition:
    """Soft-deactivate a job position. Rejects if active employees currently hold it."""
    pos = await get_job_position_by_id(db, pos_id)
    if pos is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job position with ID {pos_id} not found.",
        )

    # Check for active employees
    count = await db.scalar(
        select(func.count(Employee.id)).where(
            Employee.job_position_id == pos_id,
            Employee.status != EmployeeStatus.TERMINATED,
        )
    )
    if count and count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot deactivate job position with {count} active employee(s) assigned to it.",
        )

    pos.is_active = False
    await db.flush()
    await db.commit()
    await db.refresh(pos)
    return pos

