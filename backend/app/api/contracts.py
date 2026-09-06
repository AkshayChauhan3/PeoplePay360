"""
Contract API Router.

Endpoints for managing employment contracts, executing status lifecycle transitions
(activation, cancellation), retrieving contract details with nested relations,
and listing contracts with filtering and pagination.

Mounted at `/api/v1/contracts`.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies.auth import (
    get_current_user,
    require_hr_management,
    require_master_data_admin,
)
from app.models.contract import Contract, ContractStatus
from app.models.user import User
from app.schemas.contract import (
    ContractCreate,
    ContractListResponse,
    ContractResponse,
    ContractUpdate,
)
from app.services import contract_service

router = APIRouter(prefix="/contracts", tags=["Contracts"])


# ---------------------------------------------------------------------------
# 1. Create Contract
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=ContractResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new employment contract",
)
async def create_contract(
    data: ContractCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_hr_management()),
) -> Contract:
    """
    Create a new contract for an employee.

    RBAC Policy:
    - Allowed roles: ADMIN, HR_MANAGER, HR_PAYROLL_MANAGER, HR_PAYROLL_USER.
    - Prohibited: EMPLOYEE (403 Forbidden).

    Business Validations:
    - contract_number must be unique.
    - employee_id must be valid.
    - department_id and job_position_id default to employee's assigned values if omitted.
    - wage must be positive.
    - end_date must be >= start_date (if specified).
    - If status is RUNNING, date overlap with other running contracts is prevented (409 Conflict).
    """
    return await contract_service.create_contract(db, data)


# ---------------------------------------------------------------------------
# 2. List Contracts (Filtered & Paginated)
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=ContractListResponse,
    summary="List contracts with filtering and pagination",
)
async def list_contracts(
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Items per page"),
    employee_id: int | None = Query(default=None, description="Filter by employee ID"),
    status: ContractStatus | None = Query(default=None, description="Filter by contract status"),
    department_id: int | None = Query(default=None, description="Filter by department ID"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_hr_management()),
) -> ContractListResponse:
    """
    List contracts with optional filtering by employee, status, or department.

    RBAC Policy:
    - Allowed roles: ADMIN, HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER.
    """
    items, total = await contract_service.list_contracts(
        db=db,
        skip=skip,
        limit=limit,
        employee_id=employee_id,
        status_filter=status,
        department_id=department_id,
    )
    return ContractListResponse(items=items, total=total, skip=skip, limit=limit)


# ---------------------------------------------------------------------------
# 3. Get Contract by ID
# ---------------------------------------------------------------------------
@router.get(
    "/{contract_id}",
    response_model=ContractResponse,
    summary="Get contract details by ID",
)
async def get_contract(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Contract:
    """
    Fetch a single contract by ID with employee, department, and position relations.

    RBAC Policy:
    - HR / Admin roles can view any contract.
    - An EMPLOYEE can only view their own contract (current_user.employee_id == contract.employee_id).
    """
    contract = await contract_service.get_contract_by_id(db, contract_id)
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contract with ID {contract_id} not found.",
        )

    # Self-service access check for EMPLOYEE role
    if current_user.role_name == "EMPLOYEE" and current_user.employee_id != contract.employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this contract.",
        )

    return contract


# ---------------------------------------------------------------------------
# 4. Partial Update Contract
# ---------------------------------------------------------------------------
@router.patch(
    "/{contract_id}",
    response_model=ContractResponse,
    summary="Update contract details",
)
async def update_contract(
    contract_id: int,
    data: ContractUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_hr_management()),
) -> Contract:
    """
    Partially update contract terms, wage, dates, or status.

    RBAC Policy:
    - Allowed roles: ADMIN, HR_MANAGER, HR_PAYROLL_MANAGER, HR_PAYROLL_USER.
    """
    return await contract_service.update_contract(db, contract_id, data)


# ---------------------------------------------------------------------------
# 5. Activate Contract (Lifecycle Transition -> RUNNING)
# ---------------------------------------------------------------------------
@router.post(
    "/{contract_id}/activate",
    response_model=ContractResponse,
    summary="Activate contract (transition to RUNNING)",
)
async def activate_contract(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_master_data_admin()),
) -> Contract:
    """
    Activate a draft contract into RUNNING state.

    Enforces non-overlapping active contracts constraint:
    If another RUNNING contract overlaps the active window, returns 409 Conflict.
    """
    return await contract_service.activate_contract(db, contract_id)


# ---------------------------------------------------------------------------
# 6. Cancel Contract (Lifecycle Transition -> CANCELLED)
# ---------------------------------------------------------------------------
@router.post(
    "/{contract_id}/cancel",
    response_model=ContractResponse,
    summary="Cancel contract (transition to CANCELLED)",
)
async def cancel_contract(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_master_data_admin()),
) -> Contract:
    """
    Transition a contract to CANCELLED state.
    """
    return await contract_service.cancel_contract(db, contract_id)
