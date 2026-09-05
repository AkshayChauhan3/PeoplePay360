"""
Salary Structures API Router.

Endpoints for managing salary structures and executing stateless preview calculations:
- POST   /api/v1/salary-structures           (Payroll Manager / Admin)
- GET    /api/v1/salary-structures           (Payroll User / Payroll Manager / Admin)
- GET    /api/v1/salary-structures/{id}       (Payroll User / Payroll Manager / Admin)
- PATCH  /api/v1/salary-structures/{id}       (Payroll Manager / Admin)
- DELETE /api/v1/salary-structures/{id}       (Payroll Manager / Admin)
- GET    /api/v1/salary-structures/{id}/rules (Payroll User / Payroll Manager / Admin)
- POST   /api/v1/salary-structures/{id}/preview (Payroll User / Payroll Manager / Admin)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies.auth import require_payroll_manager, require_payroll_read
from app.models.user import User
from app.schemas.salary_rule import SalaryRuleResponse
from app.schemas.salary_structure import (
    SalaryPreviewRequest,
    SalaryPreviewResponse,
    SalaryStructureCreate,
    SalaryStructureListResponse,
    SalaryStructureResponse,
    SalaryStructureUpdate,
)
from app.services import salary_structure_service

router = APIRouter(prefix="/salary-structures", tags=["Salary Structures"])


@router.post(
    "",
    response_model=SalaryStructureResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new salary structure",
)
async def create_structure(
    data: SalaryStructureCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_manager()),
):
    """Create a new salary structure template (HR_PAYROLL_MANAGER, ADMIN)."""
    return await salary_structure_service.create_structure(db, data)


@router.get(
    "",
    response_model=SalaryStructureListResponse,
    summary="List salary structures",
)
async def list_structures(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    is_active: bool | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_read()),
):
    """List salary structures with optional active filter (HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN)."""
    items, total = await salary_structure_service.list_structures(
        db, skip=skip, limit=limit, is_active=is_active
    )
    return SalaryStructureListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{id}",
    response_model=SalaryStructureResponse,
    summary="Get salary structure by ID",
)
async def get_structure(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_read()),
):
    """Retrieve salary structure details including ordered rules (HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN)."""
    structure = await salary_structure_service.get_structure_by_id(db, id)
    if not structure:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Salary structure with ID {id} not found.",
        )
    return structure


@router.patch(
    "/{id}",
    response_model=SalaryStructureResponse,
    summary="Update salary structure",
)
async def update_structure(
    id: int,
    data: SalaryStructureUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_manager()),
):
    """Update salary structure fields (HR_PAYROLL_MANAGER, ADMIN)."""
    return await salary_structure_service.update_structure(db, id, data)


@router.delete(
    "/{id}",
    response_model=SalaryStructureResponse,
    summary="Deactivate salary structure",
)
async def deactivate_structure(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_manager()),
):
    """Soft-deactivate a salary structure (HR_PAYROLL_MANAGER, ADMIN). Blocked if active running contracts exist."""
    return await salary_structure_service.deactivate_structure(db, id)


@router.get(
    "/{id}/rules",
    response_model=list[SalaryRuleResponse],
    summary="Get all rules of a salary structure",
)
async def get_structure_rules(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_read()),
):
    """List rules belonging to a structure ordered by sequence ascending (HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN)."""
    return await salary_structure_service.get_structure_rules(db, id)


@router.post(
    "/{id}/preview",
    response_model=SalaryPreviewResponse,
    summary="Preview salary calculation for a structure",
)
async def preview_salary(
    id: int,
    req: SalaryPreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_read()),
):
    """
    Stateless preview of salary calculation against a structure given contract wage and operational context.
    Does NOT persist any Payrun, Payslip, or payment records.
    (HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN)
    """
    return await salary_structure_service.preview_structure(db, id, req)

