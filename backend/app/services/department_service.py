"""
Department Service Module — PeoplePay360

Handles all business logic for organizational departments:
- Department listing (active vs all)
- Lookups by primary key ID, unique short code, and name
- Department creation with duplicate prevention
- Partial updates (PATCH) with duplicate validation
- Guarded soft-deactivation (prevents deactivating departments with assigned active employees)
"""

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.department import Department
from app.models.employee import Employee, EmployeeStatus
from app.schemas.department import DepartmentCreate, DepartmentUpdate


async def get_departments(db: AsyncSession, include_inactive: bool = False) -> list[Department]:
    """
    Retrieve all departments ordered by ID.
    Retrieve all departments ordered by ID with manager and employee count.

    Args:
        db: Async database session.
        include_inactive: When False (default), filters only active departments (is_active=True).
                          When True, returns all departments including soft-deactivated ones.

    Returns:
        List of Department model instances.
    """
    # Build base select query ordered chronologically by primary key
    query = select(Department).order_by(Department.id)
    query = (
        select(Department)
        .options(
            selectinload(Department.manager).selectinload(Employee.job_position),
        )
        .order_by(Department.id)
    )

    # Filter out soft-deactivated departments unless explicitly requested by the caller
    if not include_inactive:
        query = query.where(Department.is_active == True)  # noqa: E712

    # Execute async query and extract scalar models
    result = await db.execute(query)
    depts = list(result.scalars().all())

    # Dynamically compute active employee counts per department
    count_query = (
        select(Employee.department_id, func.count(Employee.id))
        .where(Employee.status == EmployeeStatus.ACTIVE)
        .group_by(Employee.department_id)
    )
    count_res = await db.execute(count_query)
    counts_map = dict(count_res.all())

    for d in depts:
        d.employee_count = counts_map.get(d.id, 0)

    return depts


async def get_department_by_id(db: AsyncSession, dept_id: int) -> Department | None:
    """
    Look up a single department by its primary key ID.
    Look up a single department by its primary key ID with manager and employee count.

    Args:
        db: Async database session.
        dept_id: Department primary key.

    Returns:
        The Department instance if found, otherwise None.
    """
    result = await db.execute(select(Department).where(Department.id == dept_id))
    return result.scalar_one_or_none()
    query = (
        select(Department)
        .options(
            selectinload(Department.manager).selectinload(Employee.job_position),
        )
        .where(Department.id == dept_id)
    )
    result = await db.execute(query)
    dept = result.scalar_one_or_none()
    if dept:
        c = await db.scalar(
            select(func.count(Employee.id))
            .where(Employee.department_id == dept.id, Employee.status == EmployeeStatus.ACTIVE)
        )
        dept.employee_count = c or 0
    return dept


async def get_department_by_code(db: AsyncSession, code: str) -> Department | None:
    """
    Look up a department by its unique organizational code (e.g., 'ENG', 'HR').
    Automatically converts the input code to uppercase to ensure case-insensitive matching.

    Args:
        db: Async database session.
        code: Unique department code.

    Returns:
        The Department instance if found, otherwise None.
    """
    # Department codes are always normalized uppercase in the database
    result = await db.execute(select(Department).where(Department.code == code.upper()))
    return result.scalar_one_or_none()


async def get_department_by_name(db: AsyncSession, name: str) -> Department | None:
    """
    Look up a department by its exact unique name (e.g., 'Engineering').

    Args:
        db: Async database session.
        name: Department name.

    Returns:
        The Department instance if found, otherwise None.
    """
    result = await db.execute(select(Department).where(Department.name == name))
    return result.scalar_one_or_none()


async def create_department(db: AsyncSession, data: DepartmentCreate) -> Department:
    """
    Create and persist a new department in the database.

    Enforces business constraints:
    1. Department code must be globally unique across all departments.
    2. Department name must be globally unique.

    Args:
        db: Async database session.
        data: Validated creation schema containing name, code, and optional description.

    Returns:
        Newly created and refreshed Department model instance.

    Raises:
        HTTPException (409 Conflict): If code or name is already in use.
    """
    # 1. Check if department code already exists
    if await get_department_by_code(db, data.code) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Department with code '{data.code}' already exists.",
        )

    # 2. Check if department name already exists
    if await get_department_by_name(db, data.name) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Department with name '{data.name}' already exists.",
        )

    # 3. Instantiate model (new departments start with is_active=True by default)
    # 3. Validate manager_id if provided
    mgr = None
    if data.manager_id is not None:
        mgr = await db.scalar(
            select(Employee)
            .options(selectinload(Employee.job_position))
            .where(Employee.id == data.manager_id)
        )
        if not mgr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Manager employee with ID {data.manager_id} not found.",
            )

    # 4. Instantiate model (new departments start with is_active=True by default)
    dept = Department(
        name=data.name,
        code=data.code,
        description=data.description,
        manager_id=data.manager_id,
        is_active=True,
    )
    if mgr:
        dept.manager = mgr

    # 4. Add to session and flush to generate ID and timestamps from PostgreSQL
    # 5. Add to session and flush to generate ID and timestamps from PostgreSQL
    db.add(dept)
    await db.flush()
    await db.commit()
    await db.refresh(dept)
    dept.employee_count = 0
    return dept


async def update_department(db: AsyncSession, dept_id: int, data: DepartmentUpdate) -> Department:
    """
    Apply partial modifications (PATCH) to an existing department.

    Only non-None fields in `data` are updated. Validates that changing code or name
    does not collide with another existing department.

    Args:
        db: Async database session.
        dept_id: Target department ID.
        data: Validated update schema with optional fields.

    Returns:
        Updated and refreshed Department model instance.

    Raises:
        HTTPException (404 Not Found): If department does not exist.
        HTTPException (409 Conflict): If proposed code or name is already taken by another department.
    """
    # 1. Verify target department exists
    dept = await get_department_by_id(db, dept_id)
    if dept is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {dept_id} not found.",
        )

    # 2. If code is changing, ensure the new code is not already assigned to another department
    if data.code is not None and data.code != dept.code:
        existing = await get_department_by_code(db, data.code)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Department with code '{data.code}' already exists.",
            )
        dept.code = data.code

    # 3. If name is changing, ensure the new name is not already assigned to another department
    if data.name is not None and data.name != dept.name:
        existing = await get_department_by_name(db, data.name)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Department with name '{data.name}' already exists.",
            )
        dept.name = data.name

    # 4. Update optional fields if provided
    if data.description is not None:
        dept.description = data.description
    if data.is_active is not None:
        dept.is_active = data.is_active
    if "manager_id" in data.model_fields_set:
        if data.manager_id is not None:
            mgr = await db.scalar(
                select(Employee)
                .options(selectinload(Employee.job_position))
                .where(Employee.id == data.manager_id)
            )
            if not mgr:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Manager employee with ID {data.manager_id} not found.",
                )
            dept.manager = mgr
            dept.manager_id = data.manager_id
        else:
            dept.manager = None
            dept.manager_id = None

    # 5. Flush updates to database, commit, and refresh model attributes
    # 5. Flush updates to database and commit
    await db.flush()
    await db.commit()
    await db.refresh(dept)
    c = await db.scalar(
        select(func.count(Employee.id))
        .where(Employee.department_id == dept.id, Employee.status == EmployeeStatus.ACTIVE)
    )
    dept.employee_count = c or 0
    return dept


async def deactivate_department(db: AsyncSession, dept_id: int) -> Department:
    """
    Soft-deactivate a department by setting is_active = False.

    Guarded Deactivation Rule:
    Departments are never physically deleted (to preserve historical audit trails
    for past contracts, attendances, and payslips). However, a department CANNOT
    be deactivated if any active/non-terminated employees are currently assigned to it.

    Args:
        db: Async database session.
        dept_id: Target department ID.

    Returns:
        The deactivated Department instance.

    Raises:
        HTTPException (404 Not Found): If department does not exist.
        HTTPException (400 Bad Request): If active employees are still assigned to this department.
    """
    # 1. Verify target department exists
    dept = await get_department_by_id(db, dept_id)
    if dept is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID {dept_id} not found.",
        )

    # 2. Query count of non-terminated employees currently linked to this department
    count = await db.scalar(
        select(func.count(Employee.id)).where(
            Employee.department_id == dept_id,
            Employee.status != EmployeeStatus.TERMINATED,
        )
    )

    # 3. Block deactivation if any active employees are assigned
    if count and count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot deactivate department with {count} active employee(s) assigned to it.",
        )

    # 4. Perform soft-deactivation (retains relational integrity for historical records)
    dept.is_active = False
    await db.flush()
    await db.commit()
    await db.refresh(dept)
    return dept


