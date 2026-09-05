"""
Employee Service Layer.

Contains all core business logic for employee lifecycle management:
- Creation with foreign key validity and uniqueness checks
- Multi-field search, filtering, and pagination
- Retrieval with eager relationship loading (Department, JobPosition, Manager)
- Safe updates preventing self-manager cyclic hierarchies
- Soft deactivation (lifecycle status -> TERMINATED)
- 1:1 User account linking
"""

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.department import Department
from app.models.employee import Employee, EmployeeStatus
from app.models.job_position import JobPosition
from app.models.user import User
from app.schemas.employee import EmployeeCreate, EmployeeUpdate


def _employee_query():
    """
    Constructs the base SELECT query with eager relationship loading.

    `selectinload` instructs SQLAlchemy to load the foreign relations
    (department, job_position, manager) in a batch query, eliminating
    the classic N+1 query performance pitfall.
    """
    return select(Employee).options(
        selectinload(Employee.department),
        selectinload(Employee.job_position),
        selectinload(Employee.manager),
    )


# ---------------------------------------------------------------------------
# Query / Retrieval Helpers
# ---------------------------------------------------------------------------


async def get_employee_by_id(db: AsyncSession, employee_id: int) -> Employee | None:
    """Return an employee by ID with eager relationships loaded, or None."""
    result = await db.execute(_employee_query().where(Employee.id == employee_id))
    return result.scalar_one_or_none()


async def get_employee_by_code(db: AsyncSession, code: str) -> Employee | None:
    """Return an employee by unique code (case-insensitive), or None."""
    result = await db.execute(select(Employee).where(Employee.employee_code == code.upper()))
    return result.scalar_one_or_none()


async def get_employee_by_email(db: AsyncSession, email: str) -> Employee | None:
    """Return an employee by work email address (case-insensitive), or None."""
    result = await db.execute(select(Employee).where(Employee.email == email.lower()))
    return result.scalar_one_or_none()


async def get_employee_by_user_id(db: AsyncSession, user_id: int) -> Employee | None:
    """
    Return the Employee record linked to a given User account ID, or None.
    Used for the self-service `/api/v1/employees/me` endpoint.
    """
    result = await db.execute(
        _employee_query()
        .join(User, User.employee_id == Employee.id)
        .where(User.id == user_id)
    )
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Employee Creation
# ---------------------------------------------------------------------------


async def create_employee(db: AsyncSession, data: EmployeeCreate) -> Employee:
    """
    Validate and persist a new employee record.

    Validation pipeline:
    1. Verify target Department exists and is active.
    2. Verify target JobPosition exists and is active.
    3. If manager_id is specified, verify target manager Employee exists.
    4. Verify employee_code is unique across the company.
    5. Verify email is unique across the company.
    """
    # 1. Department existence & active verification
    dept = await db.scalar(select(Department).where(Department.id == data.department_id))
    if dept is None or not dept.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department with ID {data.department_id} does not exist or is inactive.",
        )

    # 2. Job Position existence & active verification
    pos = await db.scalar(select(JobPosition).where(JobPosition.id == data.job_position_id))
    if pos is None or not pos.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job position with ID {data.job_position_id} does not exist or is inactive.",
        )

    # 3. Manager verification (if assigned)
    if data.manager_id is not None:
        manager = await db.scalar(select(Employee).where(Employee.id == data.manager_id))
        if manager is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Manager employee with ID {data.manager_id} not found.",
            )

    # 4. Employee code uniqueness verification
    if await get_employee_by_code(db, data.employee_code) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Employee with code '{data.employee_code}' already exists.",
        )

    # 5. Work email uniqueness verification
    if await get_employee_by_email(db, data.email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Employee with email '{data.email}' already exists.",
        )

    employee = Employee(
        employee_code=data.employee_code,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email.lower(),
        phone=data.phone,
        date_of_birth=data.date_of_birth,
        joining_date=data.joining_date,
        department_id=data.department_id,
        job_position_id=data.job_position_id,
        manager_id=data.manager_id,
        status=data.status,
        bank_name=data.bank_name,
        bank_account_number=data.bank_account_number,
        ifsc_code=data.ifsc_code,
        pan_number=data.pan_number,
        account_holder_name=data.account_holder_name,
    )
    db.add(employee)
    await db.flush()

    # Re-fetch with eager relationships loaded to satisfy response schema
    result = await get_employee_by_id(db, employee.id)
    assert result is not None
    return result


# ---------------------------------------------------------------------------
# Search, Filtering & Pagination
# ---------------------------------------------------------------------------


async def list_employees(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 50,
    search: str | None = None,
    department_id: int | None = None,
    job_position_id: int | None = None,
    status_filter: EmployeeStatus | None = None,
) -> tuple[list[Employee], int]:
    """
    Search and filter employees with pagination.

    - `search`: matches across first_name, last_name, employee_code, or email using ILIKE.
    - `department_id`: filters employees by organizational unit.
    - `job_position_id`: filters employees by corporate title.
    - `status_filter`: filters by lifecycle state (ACTIVE, ON_LEAVE, etc.).

    Returns:
        tuple of (items_list, total_matching_count)
    """
    query = _employee_query()
    count_query = select(func.count(Employee.id))

    filters = []

    # Case-insensitive substring match across multiple text attributes
    if search:
        search_pattern = f"%{search.strip()}%"
        filters.append(
            or_(
                Employee.first_name.ilike(search_pattern),
                Employee.last_name.ilike(search_pattern),
                Employee.employee_code.ilike(search_pattern),
                Employee.email.ilike(search_pattern),
            )
        )

    if department_id is not None:
        filters.append(Employee.department_id == department_id)

    if job_position_id is not None:
        filters.append(Employee.job_position_id == job_position_id)

    if status_filter is not None:
        filters.append(Employee.status == status_filter)

    # Apply cumulative filters to both count and data queries
    if filters:
        query = query.where(*filters)
        count_query = count_query.where(*filters)

    # Calculate total count before pagination limits
    total = (await db.scalar(count_query)) or 0

    # Apply ordering and pagination
    query = query.order_by(Employee.id).offset(skip).limit(limit)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return items, total


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


async def update_employee(db: AsyncSession, employee_id: int, data: EmployeeUpdate) -> Employee:
    """
    Apply partial updates (PATCH) to an existing employee record.

    Validates:
    - Self-manager prevention: An employee cannot report to themselves.
    - FK references (department, job position, manager) if modified.
    - Uniqueness of employee_code or email if modified.
    """
    employee = await get_employee_by_id(db, employee_id)
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found.",
        )

    # 1. Validate self-manager rule
    if data.manager_id is not None:
        if data.manager_id == employee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An employee cannot be their own manager.",
            )
        manager = await db.scalar(select(Employee).where(Employee.id == data.manager_id))
        if manager is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Manager employee with ID {data.manager_id} not found.",
            )
        employee.manager_id = data.manager_id

    # 2. Validate department if changed
    if data.department_id is not None and data.department_id != employee.department_id:
        dept = await db.scalar(select(Department).where(Department.id == data.department_id))
        if dept is None or not dept.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Department with ID {data.department_id} does not exist or is inactive.",
            )
        employee.department_id = data.department_id

    # 3. Validate job position if changed
    if data.job_position_id is not None and data.job_position_id != employee.job_position_id:
        pos = await db.scalar(select(JobPosition).where(JobPosition.id == data.job_position_id))
        if pos is None or not pos.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Job position with ID {data.job_position_id} does not exist or is inactive.",
            )
        employee.job_position_id = data.job_position_id

    # 4. Check code uniqueness if changed
    if data.employee_code is not None and data.employee_code != employee.employee_code:
        existing = await get_employee_by_code(db, data.employee_code)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Employee with code '{data.employee_code}' already exists.",
            )
        employee.employee_code = data.employee_code

    # 5. Check email uniqueness if changed
    if data.email is not None and data.email.lower() != employee.email:
        existing = await get_employee_by_email(db, data.email)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Employee with email '{data.email}' already exists.",
            )
        employee.email = data.email.lower()

    if data.first_name is not None:
        employee.first_name = data.first_name
    if data.last_name is not None:
        employee.last_name = data.last_name
    if data.phone is not None:
        employee.phone = data.phone
    if data.date_of_birth is not None:
        employee.date_of_birth = data.date_of_birth
    if data.joining_date is not None:
        employee.joining_date = data.joining_date
    if data.status is not None:
        employee.status = data.status
    if data.bank_name is not None:
        employee.bank_name = data.bank_name
    if data.bank_account_number is not None:
        employee.bank_account_number = data.bank_account_number
    if data.ifsc_code is not None:
        employee.ifsc_code = data.ifsc_code
    if data.pan_number is not None:
        employee.pan_number = data.pan_number
    if data.account_holder_name is not None:
        employee.account_holder_name = data.account_holder_name

    await db.flush()
    res = await get_employee_by_id(db, employee_id)
    assert res is not None
    return res


# ---------------------------------------------------------------------------
# Soft Deactivation
# ---------------------------------------------------------------------------


async def deactivate_employee(db: AsyncSession, employee_id: int) -> Employee:
    """
    Soft-deactivate an employee by setting status to TERMINATED.

    Historical payroll, contracts, and attendance data remain preserved.
    """
    employee = await get_employee_by_id(db, employee_id)
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found.",
        )
    employee.status = EmployeeStatus.TERMINATED
    await db.flush()
    res = await get_employee_by_id(db, employee_id)
    assert res is not None
    return res


# ---------------------------------------------------------------------------
# 1:1 User Account Linking
# ---------------------------------------------------------------------------


async def link_user(db: AsyncSession, employee_id: int, user_id: int) -> Employee:
    """
    Link an existing User account to an Employee record in a 1:1 relationship.

    Rules enforced:
    - Target employee must exist.
    - Target user must exist.
    - Employee must NOT already have a linked user account.
    - User must NOT already be linked to an employee.
    """
    employee = await get_employee_by_id(db, employee_id)
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee with ID {employee_id} not found.",
        )

    # Check if employee already has a linked user
    existing_link = await db.scalar(select(User).where(User.employee_id == employee_id))
    if existing_link is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee {employee_id} is already linked to user account {existing_link.id}.",
        )

    # Check if user exists
    user = await db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )

    # Check if user is already linked to another employee
    if user.employee_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User {user_id} is already linked to employee {user.employee_id}.",
        )

    # Perform the link on the User side of the foreign key
    user.employee_id = employee_id
    await db.flush()

    res = await get_employee_by_id(db, employee_id)
    assert res is not None
    return res
