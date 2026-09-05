"""
Time Off API Router — PeoplePay360

Endpoints for:
- Leave Types (CRUD & Soft-Deactivation)
- Leave Allocations (Grants, status lifecycle, balances)
- Leave Requests (Submission, atomic approval, refusal, cancellation)
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies.auth import get_current_user, require_hr_management
from app.models.time_off import AllocationStatus, TimeOffRequestStatus
from app.models.user import User, UserRole
from app.schemas.time_off import (
    TimeOffAllocationCreate,
    TimeOffAllocationResponse,
    TimeOffAllocationUpdate,
    TimeOffBalanceResponse,
    TimeOffRequestCreate,
    TimeOffRequestRefuse,
    TimeOffRequestResponse,
    TimeOffRequestUpdate,
    TimeOffTypeCreate,
    TimeOffTypeResponse,
    TimeOffTypeUpdate,
)
from app.services import (
    time_off_allocation_service,
    time_off_request_service,
    time_off_type_service,
)

router = APIRouter(tags=["Time Off"])

_HR_ROLES = {
    UserRole.ADMIN.value,
    UserRole.HR_MANAGER.value,
    UserRole.HR_PAYROLL_MANAGER.value,
    UserRole.HR_PAYROLL_USER.value,
}


def _is_hr(user: User) -> bool:
    return user.role_name in _HR_ROLES


# ===========================================================================
# 1. TIME OFF TYPES
# ===========================================================================

@router.get(
    "/types",
    response_model=list[TimeOffTypeResponse],
    summary="List all time off types",
)
async def list_types(
    include_inactive: bool = Query(False, description="Include deactivated leave types"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await time_off_type_service.list_types(db, include_inactive=include_inactive)


@router.post(
    "/types",
    response_model=TimeOffTypeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new time off type (HR/Admin)",
)
async def create_type(
    data: TimeOffTypeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hr_management()),
):
    return await time_off_type_service.create_type(db, data)


@router.get(
    "/types/{id}",
    response_model=TimeOffTypeResponse,
    summary="Get time off type details",
)
async def get_type(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    leave_type = await time_off_type_service.get_type_by_id(db, id)
    if leave_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time off type with ID {id} not found.",
        )
    return leave_type


@router.patch(
    "/types/{id}",
    response_model=TimeOffTypeResponse,
    summary="Update time off type (HR/Admin)",
)
async def update_type(
    id: int,
    data: TimeOffTypeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hr_management()),
):
    return await time_off_type_service.update_type(db, id, data)


@router.delete(
    "/types/{id}",
    response_model=TimeOffTypeResponse,
    summary="Soft-deactivate time off type (HR/Admin)",
)
async def delete_type(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hr_management()),
):
    return await time_off_type_service.deactivate_type(db, id)


# ===========================================================================
# 2. TIME OFF ALLOCATIONS
# ===========================================================================

@router.post(
    "/allocations",
    response_model=TimeOffAllocationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Grant leave allocation to employee (HR/Admin)",
)
async def create_allocation(
    data: TimeOffAllocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hr_management()),
):
    return await time_off_allocation_service.create_allocation(db, data)


@router.get(
    "/allocations",
    response_model=list[TimeOffAllocationResponse],
    summary="List leave allocations",
)
async def list_allocations(
    employee_id: int | None = Query(None, description="Filter by employee ID"),
    time_off_type_id: int | None = Query(None, description="Filter by time off type ID"),
    status_filter: AllocationStatus | None = Query(None, alias="status", description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_hr(current_user):
        if current_user.employee_id is None:
            return []
        employee_id = current_user.employee_id

    return await time_off_allocation_service.list_allocations(
        db=db,
        employee_id=employee_id,
        time_off_type_id=time_off_type_id,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/allocations/{id}",
    response_model=TimeOffAllocationResponse,
    summary="Get allocation details",
)
async def get_allocation(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allocation = await time_off_allocation_service.get_allocation_by_id(db, id)
    if allocation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time off allocation with ID {id} not found.",
        )
    if not _is_hr(current_user) and allocation.employee_id != current_user.employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view another employee's allocation.",
        )
    return allocation


@router.patch(
    "/allocations/{id}",
    response_model=TimeOffAllocationResponse,
    summary="Update allocation grant (HR/Admin)",
)
async def update_allocation(
    id: int,
    data: TimeOffAllocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hr_management()),
):
    return await time_off_allocation_service.update_allocation(db, id, data)


@router.delete(
    "/allocations/{id}",
    response_model=TimeOffAllocationResponse,
    summary="Cancel unused allocation grant (HR/Admin)",
)
async def delete_allocation(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hr_management()),
):
    return await time_off_allocation_service.cancel_allocation(db, id)


# ===========================================================================
# 3. TIME OFF REQUESTS
# ===========================================================================

@router.post(
    "/requests",
    response_model=TimeOffRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit leave request (Self-service or HR on behalf of employee)",
)
async def create_request(
    data: TimeOffRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Determine target employee
    if _is_hr(current_user):
        target_employee_id = data.employee_id if data.employee_id is not None else current_user.employee_id
        if target_employee_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="employee_id is required when creating a request as HR.",
            )
    else:
        if current_user.employee_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your user account is not linked to an employee profile.",
            )
        target_employee_id = current_user.employee_id

    return await time_off_request_service.create_request(
        db=db,
        employee_id=target_employee_id,
        data=data,
        current_user=current_user,
    )


@router.get(
    "/requests",
    response_model=list[TimeOffRequestResponse],
    summary="List leave requests",
)
async def list_requests(
    employee_id: int | None = Query(None, description="Filter by employee ID"),
    time_off_type_id: int | None = Query(None, description="Filter by time off type ID"),
    status_filter: TimeOffRequestStatus | None = Query(None, alias="status", description="Filter by status"),
    from_date: date | None = Query(None, description="Filter requests ending on or after this date"),
    to_date: date | None = Query(None, description="Filter requests starting on or before this date"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_hr(current_user):
        if current_user.employee_id is None:
            return []
        employee_id = current_user.employee_id

    return await time_off_request_service.list_requests(
        db=db,
        employee_id=employee_id,
        time_off_type_id=time_off_type_id,
        status_filter=status_filter,
        from_date=from_date,
        to_date=to_date,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/requests/{id}",
    response_model=TimeOffRequestResponse,
    summary="Get leave request details",
)
async def get_request(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = await time_off_request_service.get_request_by_id(db, id)
    if req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time off request with ID {id} not found.",
        )
    if not _is_hr(current_user) and req.employee_id != current_user.employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view another employee's leave request.",
        )
    return req


@router.patch(
    "/requests/{id}",
    response_model=TimeOffRequestResponse,
    summary="Update pending leave request",
)
async def update_request(
    id: int,
    data: TimeOffRequestUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = await time_off_request_service.get_request_by_id(db, id)
    if req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time off request with ID {id} not found.",
        )
    if not _is_hr(current_user) and req.employee_id != current_user.employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit another employee's leave request.",
        )
    if req.status != TimeOffRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only PENDING requests can be edited. Current status: {req.status}.",
        )

    effective_start = data.start_date if data.start_date is not None else req.start_date
    effective_end = data.end_date if data.end_date is not None else req.end_date
    if effective_end < effective_start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="end_date cannot be earlier than start_date.",
        )

    # Re-check overlap if dates changed
    if data.start_date is not None or data.end_date is not None:
        await time_off_request_service.check_overlapping_requests(
            db=db,
            employee_id=req.employee_id,
            start_date=effective_start,
            end_date=effective_end,
            exclude_request_id=req.id,
        )
        req.start_date = effective_start
        req.end_date = effective_end
        # Recalculate quantity
        req.requested_quantity = time_off_request_service.calculate_quantity(
            unit=req.time_off_type.unit,
            start_date=effective_start,
            end_date=effective_end,
            explicit_quantity=data.requested_quantity,
        )
    elif data.requested_quantity is not None:
        req.requested_quantity = data.requested_quantity

    if data.reason is not None:
        req.reason = data.reason

    await db.flush()
    await db.refresh(req)
    return req


@router.post(
    "/requests/{id}/approve",
    response_model=TimeOffRequestResponse,
    summary="Approve leave request (HR/Admin only; row-level locked balance deduction)",
)
async def approve_request(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hr_management()),
):
    req = await time_off_request_service.get_request_by_id(db, id)
    if req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time off request with ID {id} not found.",
        )
    # Prevent employee from approving their own request unless Admin
    if req.employee_id == current_user.employee_id and current_user.role_name != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot approve your own leave request.",
        )

    return await time_off_request_service.approve_request(
        db=db,
        request_id=id,
        user_id=current_user.id,
    )


@router.post(
    "/requests/{id}/refuse",
    response_model=TimeOffRequestResponse,
    summary="Refuse leave request (HR/Admin only)",
)
async def refuse_request(
    id: int,
    data: TimeOffRequestRefuse,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_hr_management()),
):
    req = await time_off_request_service.get_request_by_id(db, id)
    if req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time off request with ID {id} not found.",
        )
    if req.employee_id == current_user.employee_id and current_user.role_name != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot refuse your own leave request.",
        )

    return await time_off_request_service.refuse_request(
        db=db,
        request_id=id,
        refusal_reason=data.refusal_reason,
        user_id=current_user.id,
    )


@router.post(
    "/requests/{id}/cancel",
    response_model=TimeOffRequestResponse,
    summary="Cancel leave request (Owner employee or HR/Admin; restores balance)",
)
async def cancel_request(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await time_off_request_service.cancel_request(
        db=db,
        request_id=id,
        current_user=current_user,
    )


# ===========================================================================
# 4. LEAVE BALANCES
# ===========================================================================

@router.get(
    "/balances",
    response_model=TimeOffBalanceResponse,
    summary="Get employee leave balances",
)
async def get_leave_balances(
    employee_id: int | None = Query(None, description="Employee ID (defaults to self for non-HR)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_hr(current_user):
        if current_user.employee_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your user account is not linked to an employee profile.",
            )
        target_employee_id = current_user.employee_id
    else:
        target_employee_id = employee_id if employee_id is not None else current_user.employee_id
        if target_employee_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="employee_id query parameter is required for administrators.",
            )

    return await time_off_allocation_service.get_employee_balances(db, target_employee_id)
