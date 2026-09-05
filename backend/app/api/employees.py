"""
Employee API Router.

Endpoints for managing employees, executing searches, querying profiles,
and linking user accounts.

Mounted at `/api/v1/employees`.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies.auth import (
    get_current_user,
    require_hr_management,
    require_master_data_admin,
)
from app.models.attendance import AttendanceStatus
from app.models.contract import Contract
from app.models.employee import Employee, EmployeeStatus
from app.models.time_off import AllocationStatus, TimeOffRequestStatus
from app.models.user import User, UserRole
from app.schemas.attendance import AttendanceListResponse, AttendanceResponse
from app.schemas.contract import ContractResponse
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeResponse,
    EmployeeUpdate,
    LinkUserRequest,
)
from app.schemas.time_off import (
    TimeOffAllocationResponse,
    TimeOffBalanceResponse,
    TimeOffRequestCreate,
    TimeOffRequestResponse,
)
from app.services import (
    attendance_service,
    contract_service,
    employee_service,
    time_off_allocation_service,
    time_off_request_service,
)

router = APIRouter(prefix="/employees", tags=["Employees"])

_HR_ROLES = {
    UserRole.ADMIN.value,
    UserRole.HR_MANAGER.value,
    UserRole.HR_PAYROLL_USER.value,
    UserRole.HR_PAYROLL_MANAGER.value,
}


def _format_att(att) -> AttendanceResponse:
    emp_name = att.employee.full_name if att.employee else None
    return AttendanceResponse(
        id=att.id,
        employee_id=att.employee_id,
        employee_name=emp_name,
        attendance_date=att.attendance_date,
        check_in=att.check_in,
        check_out=att.check_out,
        worked_minutes=att.worked_minutes,
        late_minutes=att.late_minutes,
        overtime_minutes=att.overtime_minutes,
        status=att.status,
        is_manual_edit=att.is_manual_edit,
        correction_reason=att.correction_reason,
        elapsed_hours=att.elapsed_hours,
        net_hours=att.net_hours,
        late_hours=att.late_hours,
        overtime_hours=att.overtime_hours,
        created_at=att.created_at,
        updated_at=att.updated_at,
    )


# ---------------------------------------------------------------------------
# 1. Create Employee
# ---------------------------------------------------------------------------
@router.post(
    "",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create employee",
)
async def create_employee(
    data: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_hr_management()),
) -> Employee:
    """
    Create a new employee record.

    RBAC Policy:
    - Allowed roles: HR_MANAGER, HR_PAYROLL_USER, HR_PAYROLL_MANAGER, ADMIN.
    - Blocked: Ordinary EMPLOYEE role (403 Forbidden).
    """
    return await employee_service.create_employee(db, data)


# ---------------------------------------------------------------------------
# 2. List Employees (with Search, Filter, and Pagination)
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=list[EmployeeResponse],
    summary="List employees",
)
async def list_employees(
    response: Response,
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Items per page"),
    search: str | None = Query(default=None, description="Search by name, code, or email"),
    department_id: int | None = Query(default=None, description="Filter by department ID"),
    job_position_id: int | None = Query(default=None, description="Filter by job position ID"),
    status: EmployeeStatus | None = Query(default=None, description="Filter by employee status"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_hr_management()),
) -> list[Employee]:
    """
    List employees with optional search, filtering, and pagination.

    Total matching record count is returned in the `X-Total-Count` HTTP response header.
    """
    items, total = await employee_service.list_employees(
        db,
        skip=skip,
        limit=limit,
        search=search,
        department_id=department_id,
        job_position_id=job_position_id,
        status_filter=status,
    )
    response.headers["X-Total-Count"] = str(total)
    return items


# ---------------------------------------------------------------------------
# 3. Self-Service Profile (Must be declared BEFORE `/{employee_id}`)
# ---------------------------------------------------------------------------
# IMPORTANT: This route must appear before `/{employee_id}` in code.
# Otherwise, FastAPI will treat the literal string "me" as an integer path
# parameter and return HTTP 422 Unprocessable Entity.
@router.get(
    "/me",
    response_model=EmployeeResponse,
    summary="Get current user's employee profile",
)
async def get_my_employee_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Employee:
    """
    Self-service endpoint for any authenticated user to fetch their own linked employee profile.

    Does not require HR roles; available to any authenticated user with a linked employee record.
    """
    employee = await employee_service.get_employee_by_user_id(db, current_user.id)
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No employee record is linked to the current user account.",
        )
    return employee


# ---------------------------------------------------------------------------
# 3b. Self-Service Current Employee Attendance History
# ---------------------------------------------------------------------------
@router.get(
    "/me/attendance",
    response_model=AttendanceListResponse,
    summary="Get current logged-in employee attendance history",
)
async def get_my_attendance(
    date_from: date | None = Query(None, description="Start date filter (YYYY-MM-DD)"),
    date_to: date | None = Query(None, description="End date filter (YYYY-MM-DD)"),
    status_filter: AttendanceStatus | None = Query(None, alias="status", description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceListResponse:
    """List attendance history for the currently authenticated employee."""
    if current_user.employee_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user account is not linked to an employee profile.",
        )
    items, total = await attendance_service.list_attendances(
        db,
        employee_id=current_user.employee_id,
        date_from=date_from,
        date_to=date_to,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )
    return AttendanceListResponse(
        items=[_format_att(i) for i in items],
        total=total,
        skip=skip,
        limit=limit,
    )


# ---------------------------------------------------------------------------
# 3c. Self-Service Current Employee Time Off Allocations
# ---------------------------------------------------------------------------
@router.get(
    "/me/time-off/allocations",
    response_model=list[TimeOffAllocationResponse],
    summary="Get current logged-in employee time off allocations",
)
async def get_my_time_off_allocations(
    time_off_type_id: int | None = Query(None, description="Filter by leave type ID"),
    status_filter: AllocationStatus | None = Query(None, alias="status", description="Filter by allocation status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TimeOffAllocationResponse]:
    """List all leave allocations for the currently authenticated employee."""
    if current_user.employee_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user account is not linked to an employee profile.",
        )
    return await time_off_allocation_service.list_allocations(
        db=db,
        employee_id=current_user.employee_id,
        time_off_type_id=time_off_type_id,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )


# ---------------------------------------------------------------------------
# 3d. Self-Service Current Employee Time Off Requests
# ---------------------------------------------------------------------------
@router.get(
    "/me/time-off/requests",
    response_model=list[TimeOffRequestResponse],
    summary="Get current logged-in employee time off requests",
)
async def get_my_time_off_requests(
    time_off_type_id: int | None = Query(None, description="Filter by leave type ID"),
    status_filter: TimeOffRequestStatus | None = Query(None, alias="status", description="Filter by request status"),
    from_date: date | None = Query(None, description="Filter requests ending on or after this date"),
    to_date: date | None = Query(None, description="Filter requests starting on or before this date"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TimeOffRequestResponse]:
    """List all leave requests for the currently authenticated employee."""
    if current_user.employee_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user account is not linked to an employee profile.",
        )
    return await time_off_request_service.list_requests(
        db=db,
        employee_id=current_user.employee_id,
        time_off_type_id=time_off_type_id,
        status_filter=status_filter,
        from_date=from_date,
        to_date=to_date,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/me/time-off/requests",
    response_model=TimeOffRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit leave request for current logged-in employee",
)
async def create_my_time_off_request(
    data: TimeOffRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TimeOffRequestResponse:
    """Submit a new leave request for the currently authenticated employee."""
    if current_user.employee_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user account is not linked to an employee profile.",
        )
    return await time_off_request_service.create_request(
        db=db,
        employee_id=current_user.employee_id,
        data=data,
        current_user=current_user,
    )


# ---------------------------------------------------------------------------
# 3e. Self-Service Current Employee Time Off Balances
# ---------------------------------------------------------------------------
@router.get(
    "/me/time-off/balances",
    response_model=TimeOffBalanceResponse,
    summary="Get current logged-in employee time off balances",
)
async def get_my_time_off_balances(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TimeOffBalanceResponse:
    """Calculate and return aggregated leave balances for the currently authenticated employee."""
    if current_user.employee_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user account is not linked to an employee profile.",
        )
    return await time_off_allocation_service.get_employee_balances(db, current_user.employee_id)


# ---------------------------------------------------------------------------
# 4. Get Employee by ID
# ---------------------------------------------------------------------------
@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Get employee by ID",
)
async def get_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_hr_management()),
) -> Employee:
    """
    Fetch an employee by integer ID.
    Returns nested department, job position, and manager snapshots.
    """
    employee = await employee_service.get_employee_by_id(db, employee_id)
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found.",
        )
    return employee


# ---------------------------------------------------------------------------
# 5. Partial Update (PATCH)
# ---------------------------------------------------------------------------
@router.patch(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Update employee",
)
async def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_hr_management()),
) -> Employee:
    """
    Partially update employee details.
    Rejects self-manager cyclic hierarchies (HTTP 400).
    """
    return await employee_service.update_employee(db, employee_id, data)


# ---------------------------------------------------------------------------
# 6. Soft Deactivation (DELETE)
# ---------------------------------------------------------------------------
@router.delete(
    "/{employee_id}",
    response_model=EmployeeResponse,
    summary="Deactivate/Terminate employee",
)
async def deactivate_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_hr_management()),
) -> Employee:
    """
    Soft-deactivate an employee by transitioning status to TERMINATED.
    Data is preserved for historical payroll and legal audit compliance.
    """
    return await employee_service.deactivate_employee(db, employee_id)


# ---------------------------------------------------------------------------
# 7. User ↔ Employee 1:1 Link
# ---------------------------------------------------------------------------
@router.post(
    "/{employee_id}/user",
    response_model=EmployeeResponse,
    summary="Link an existing user account to this employee",
)
async def link_user_to_employee(
    employee_id: int,
    data: LinkUserRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_master_data_admin()),
) -> Employee:
    """
    Explicitly link an existing User login account to an Employee record.

    Enforces 1:1 relationship constraints:
    - One employee may have at most one user account.
    - One user account may be linked to at most one employee.
    """
    return await employee_service.link_user(db, employee_id, data.user_id)


# ---------------------------------------------------------------------------
# 8. Employee Contracts History
# ---------------------------------------------------------------------------
@router.get(
    "/{employee_id}/contracts",
    response_model=list[ContractResponse],
    summary="Get all contracts for an employee",
)
async def get_employee_contracts(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Contract]:
    """
    List all employment contracts for a specific employee.

    RBAC Policy:
    - HR / Admin roles can view contracts for any employee.
    - An EMPLOYEE can only view their own contracts (current_user.employee_id == employee_id).
    """
    if current_user.role_name == "EMPLOYEE" and current_user.employee_id != employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view contracts for other employees.",
        )
    return await contract_service.get_employee_contracts(db, employee_id)


# ---------------------------------------------------------------------------
# 9. Employee Attendance History
# ---------------------------------------------------------------------------
@router.get(
    "/{employee_id}/attendance",
    response_model=AttendanceListResponse,
    summary="Get all attendance records for an employee",
)
async def get_employee_attendance(
    employee_id: int,
    date_from: date | None = Query(None, description="Start date filter (YYYY-MM-DD)"),
    date_to: date | None = Query(None, description="End date filter (YYYY-MM-DD)"),
    status_filter: AttendanceStatus | None = Query(None, alias="status", description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AttendanceListResponse:
    """
    List all attendance records for a specific employee.

    RBAC Policy:
    - HR / Admin roles can view attendance for any employee.
    - An EMPLOYEE can only view their own attendance (current_user.employee_id == employee_id).
    """
    if current_user.role_name == "EMPLOYEE" and current_user.employee_id != employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view attendance for other employees.",
        )
    items, total = await attendance_service.list_attendances(
        db,
        employee_id=employee_id,
        date_from=date_from,
        date_to=date_to,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )
    return AttendanceListResponse(
        items=[_format_att(i) for i in items],
        total=total,
        skip=skip,
        limit=limit,
    )


# ---------------------------------------------------------------------------
# 10. Employee Time Off Allocations
# ---------------------------------------------------------------------------
@router.get(
    "/{employee_id}/time-off/allocations",
    response_model=list[TimeOffAllocationResponse],
    summary="Get all time off allocations for an employee",
)
async def get_employee_time_off_allocations(
    employee_id: int,
    time_off_type_id: int | None = Query(None, description="Filter by leave type ID"),
    status_filter: AllocationStatus | None = Query(None, alias="status", description="Filter by allocation status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TimeOffAllocationResponse]:
    """
    List all leave allocations for a specific employee.
    Allowed for HR/Admin, or the employee themselves.
    """
    is_hr = current_user.role_name in _HR_ROLES
    if not is_hr and current_user.employee_id != employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view allocations for other employees.",
        )
    return await time_off_allocation_service.list_allocations(
        db=db,
        employee_id=employee_id,
        time_off_type_id=time_off_type_id,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )


# ---------------------------------------------------------------------------
# 11. Employee Time Off Requests
# ---------------------------------------------------------------------------
@router.get(
    "/{employee_id}/time-off/requests",
    response_model=list[TimeOffRequestResponse],
    summary="Get all time off requests for an employee",
)
async def get_employee_time_off_requests(
    employee_id: int,
    time_off_type_id: int | None = Query(None, description="Filter by leave type ID"),
    status_filter: TimeOffRequestStatus | None = Query(None, alias="status", description="Filter by request status"),
    from_date: date | None = Query(None, description="Filter requests ending on or after this date"),
    to_date: date | None = Query(None, description="Filter requests starting on or before this date"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TimeOffRequestResponse]:
    """
    List all leave requests for a specific employee.
    Allowed for HR/Admin, or the employee themselves.
    """
    is_hr = current_user.role_name in _HR_ROLES
    if not is_hr and current_user.employee_id != employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view leave requests for other employees.",
        )
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


# ---------------------------------------------------------------------------
# 12. Employee Time Off Balances
# ---------------------------------------------------------------------------
@router.get(
    "/{employee_id}/time-off/balances",
    response_model=TimeOffBalanceResponse,
    summary="Get employee leave balances",
)
async def get_employee_time_off_balances(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TimeOffBalanceResponse:
    """
    Calculate and return aggregated leave balances for a specific employee.
    Allowed for HR/Admin, or the employee themselves.
    """
    is_hr = current_user.role_name in _HR_ROLES
    if not is_hr and current_user.employee_id != employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view leave balances for other employees.",
        )
    return await time_off_allocation_service.get_employee_balances(db, employee_id)

