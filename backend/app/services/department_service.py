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

from app.models.department import Department
from app.models.employee import Employee, EmployeeStatus
from app.schemas.department import DepartmentCreate, DepartmentUpdate


async def get_departments(db: AsyncSession, include_inactive: bool = False) -> list[Department]:
    """
    Retrieve all departments ordered by ID.

    Args:
        db: Async database session.
        include_inactive: When False (default), filters only active departments (is_active=True).
                          When True, returns all departments including soft-deactivated ones.

    Returns:
        List of Department model instances.
    """
    # Build base select query ordered chronologically by primary key
    query = select(Department).order_by(Department.id)

    # Filter out soft-deactivated departments unless explicitly requested by the caller
    if not include_inactive:
        query = query.where(Department.is_active == True)  # noqa: E712

    # Execute async query and extract scalar models
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_department_by_id(db: AsyncSession, dept_id: int) -> Department | None:
    """
    Look up a single department by its primary key ID.

    Args:
        db: Async database session.
        dept_id: Department primary key.

    Returns:
        The Department instance if found, otherwise None.
    """
    result = await db.execute(select(Department).where(Department.id == dept_id))
    return result.scalar_one_or_none()


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
    dept = Department(
        name=data.name,
        code=data.code,
        description=data.description,
        is_active=True,
    )

    # 4. Add to session and flush to generate ID and timestamps from PostgreSQL
    db.add(dept)
    await db.flush()
    await db.refresh(dept)
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

    # 5. Flush updates to database and refresh model attributes
    await db.flush()
    await db.refresh(dept)
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
    await db.refresh(dept)
    return dept


