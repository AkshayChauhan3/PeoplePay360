from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies.auth import get_current_user, require_master_data_admin
from app.models.job_position import JobPosition
from app.models.user import User
from app.schemas.job_position import (
    JobPositionCreate,
    JobPositionResponse,
    JobPositionUpdate,
)
from app.services import job_position_service

router = APIRouter(prefix="/job-positions", tags=["Job Positions"])


@router.get(
    "",
    response_model=list[JobPositionResponse],
    summary="List job positions",
)
async def list_job_positions(
    include_inactive: bool = Query(default=False, description="Include deactivated positions"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[JobPosition]:
    """List job positions. Available to all authenticated users."""
    return await job_position_service.get_job_positions(db, include_inactive=include_inactive)


@router.post(
    "",
    response_model=JobPositionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create job position",
)
async def create_job_position(
    data: JobPositionCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_master_data_admin()),
) -> JobPosition:
    """Create a new job position. Requires HR_MANAGER, HR_PAYROLL_MANAGER, or ADMIN role."""
    return await job_position_service.create_job_position(db, data)


@router.get(
    "/{job_position_id}",
    response_model=JobPositionResponse,
    summary="Get job position by ID",
)
async def get_job_position(
    job_position_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> JobPosition:
    """Get job position details by ID. Available to all authenticated users."""
    pos = await job_position_service.get_job_position_by_id(db, job_position_id)
    if pos is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job position with ID {job_position_id} not found.",
        )
    return pos


@router.patch(
    "/{job_position_id}",
    response_model=JobPositionResponse,
    summary="Update job position",
)
async def update_job_position(
    job_position_id: int,
    data: JobPositionUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_master_data_admin()),
) -> JobPosition:
    """Update job position details. Requires HR_MANAGER, HR_PAYROLL_MANAGER, or ADMIN role."""
    return await job_position_service.update_job_position(db, job_position_id, data)


@router.delete(
    "/{job_position_id}",
    response_model=JobPositionResponse,
    summary="Deactivate job position",
)
async def deactivate_job_position(
    job_position_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_master_data_admin()),
) -> JobPosition:
    """Soft-deactivate a job position. Requires HR_MANAGER, HR_PAYROLL_MANAGER, or ADMIN role."""
    return await job_position_service.deactivate_job_position(db, job_position_id)

