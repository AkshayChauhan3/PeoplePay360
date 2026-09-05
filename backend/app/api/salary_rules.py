"""
Salary Rules API Router.

Endpoints for managing individual salary rules:
- POST   /api/v1/salary-rules       (Payroll Manager / Admin)
- GET    /api/v1/salary-rules       (Payroll User / Payroll Manager / Admin)
- GET    /api/v1/salary-rules/{id}   (Payroll User / Payroll Manager / Admin)
- PATCH  /api/v1/salary-rules/{id}   (Payroll Manager / Admin)
- DELETE /api/v1/salary-rules/{id}   (Payroll Manager / Admin)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies.auth import require_payroll_manager, require_payroll_read
from app.models.salary_rule import ComputationType, SalaryRuleCategory
from app.models.user import User
from app.schemas.salary_rule import (
    SalaryRuleCreate,
    SalaryRuleListResponse,
    SalaryRuleResponse,
    SalaryRuleUpdate,
)
from app.services import salary_rule_service

router = APIRouter(prefix="/salary-rules", tags=["Salary Rules"])


@router.post(
    "",
    response_model=SalaryRuleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new salary rule",
)
async def create_rule(
    data: SalaryRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_manager()),
):
    """
    Create a salary rule within a salary structure.
    Validates computation type integrity, dependency sequencing, and prevents circular dependencies.
    (HR_PAYROLL_MANAGER, ADMIN)
    """
    return await salary_rule_service.create_rule(db, data)


@router.get(
    "",
    response_model=SalaryRuleListResponse,
    summary="List salary rules",
)
async def list_rules(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    salary_structure_id: int | None = Query(default=None),
    category: SalaryRuleCategory | None = Query(default=None),
    computation_type: ComputationType | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_read()),
):
    """
    List salary rules with optional filters by structure, category, computation type, and active status.
    Ordered by sequence ascending.
    (HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN)
    """
    items, total = await salary_rule_service.list_rules(
        db,
        skip=skip,
        limit=limit,
        salary_structure_id=salary_structure_id,
        category=category,
        computation_type=computation_type,
        is_active=is_active,
    )
    return SalaryRuleListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{id}",
    response_model=SalaryRuleResponse,
    summary="Get salary rule by ID",
)
async def get_rule(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_read()),
):
    """Retrieve salary rule details (HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN)."""
    rule = await salary_rule_service.get_rule_by_id(db, id)
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Salary rule with ID {id} not found.",
        )
    return rule


@router.patch(
    "/{id}",
    response_model=SalaryRuleResponse,
    summary="Update salary rule",
)
async def update_rule(
    id: int,
    data: SalaryRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_manager()),
):
    """
    Update a salary rule.
    Validates field integrity, sequence uniqueness, formula syntax, and cycle prevention.
    (HR_PAYROLL_MANAGER, ADMIN)
    """
    return await salary_rule_service.update_rule(db, id, data)


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete salary rule",
)
async def delete_rule(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_payroll_manager()),
):
    """
    Delete a salary rule from its structure.
    Blocked if other rules depend on this rule code.
    (HR_PAYROLL_MANAGER, ADMIN)
    """
    await salary_rule_service.delete_rule(db, id)

