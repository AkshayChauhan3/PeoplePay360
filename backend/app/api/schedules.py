from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies.auth import get_current_user, require_hr_management
from app.models.user import User
from app.schemas.schedule import ScheduleIn, ScheduleOut
from app.services import schedule_service

router = APIRouter(prefix="/schedules", tags=["Schedules"])


@router.get("", response_model=list[ScheduleOut])
async def list_schedules(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ScheduleOut]:
    """List all working schedules with line definitions."""
    return await schedule_service.list_schedules(db, skip=skip, limit=limit)


@router.post("", response_model=ScheduleOut, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    data: ScheduleIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hr_management()),
) -> ScheduleOut:
    """Create a new working schedule (HR & Admin only)."""
    return await schedule_service.create_schedule(db, data)


@router.get("/{id}", response_model=ScheduleOut)
async def get_schedule(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScheduleOut:
    """Retrieve schedule details by ID."""
    sched = await schedule_service.get_schedule_by_id(db, id)
    if sched is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Working schedule with ID {id} does not exist.",
        )
    return sched

