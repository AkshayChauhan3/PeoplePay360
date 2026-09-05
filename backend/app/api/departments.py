from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies.auth import get_current_user, require_master_data_admin
from app.models.department import Department
from app.models.user import User
from app.schemas.department import (
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
)
from app.services import department_service

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get(
    "",
    response_model=list[DepartmentResponse],
    summary="List departments",
)
async def list_departments(
    include_inactive: bool = Query(default=False, description="Include deactivated departments"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Department]:
    """List departments. Available to all authenticated users."""
    return await department_service.get_departments(db, include_inactive=include_inactive)


@router.post(
    "",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create department",
)
async def create_department(
    data: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_master_data_admin()),
) -> Department:
    """Create a new department. Requires HR_MANAGER, HR_PAYROLL_MANAGER, or ADMIN role."""
    return await department_service.create_department(db, data)


@router.get(
    "/{department_id}",
    response_model=DepartmentResponse,
    summary="Get department by ID",
)
async def get_department(
    department_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Department:
    """Get department details by ID. Available to all authenticated users."""
    dept = await department_service.get_department_by_id(db, department_id)
    if dept is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {department_id} not found.",
        )
    return dept


@router.patch(
    "/{department_id}",
    response_model=DepartmentResponse,
    summary="Update department",
)
async def update_department(
    department_id: int,
    data: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_master_data_admin()),
) -> Department:
    """Update department details. Requires HR_MANAGER, HR_PAYROLL_MANAGER, or ADMIN role."""
    return await department_service.update_department(db, department_id, data)


@router.delete(
    "/{department_id}",
    response_model=DepartmentResponse,
    summary="Deactivate department",
)
async def deactivate_department(
    department_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_master_data_admin()),
) -> Department:
    """Soft-deactivate a department. Requires HR_MANAGER, HR_PAYROLL_MANAGER, or ADMIN role."""
    return await department_service.deactivate_department(db, department_id)

