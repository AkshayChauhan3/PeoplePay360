"""
User Service Module — PeoplePay360

Handles all authentication and user identity management logic:
- User lookups by primary key ID and email address
- Eager relationship loading (`role`, `employee`) via `selectinload`
- New user account creation with:
  * Duplicate email conflict detection
  * System role validation and defaulting (default: `EMPLOYEE` role)
  * 1:1 Employee linking validation (ensures an employee is linked to at most one user account)
  * Secure password hashing via bcrypt
"""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User, UserRole
from app.schemas.user import UserCreate
from app.services import role_service


def _user_query():
    """
    Construct base select query for User with eager-loaded relationships.

    Why selectinload?
    In SQLAlchemy async mode (asyncpg), accessing unloaded relationships outside
    the initial query triggers lazy loading which raises `MissingGreenlet` errors.
    Using `selectinload(User.role)` and `selectinload(User.employee)` issues a secondary
    optimized IN-query, populating the relationships upfront within the same async call.
    """
    return select(User).options(
        selectinload(User.role),
        selectinload(User.employee),
    )


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """
    Look up a user account by unique email address with role and employee eagerly loaded.

    Args:
        db: Async database session.
        email: Login email address to search.

    Returns:
        The matching User instance with relationships loaded, or None if not found.
    """
    result = await db.execute(_user_query().where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    """
    Look up a user account by primary key ID with role and employee eagerly loaded.

    Args:
        db: Async database session.
        user_id: Primary key user ID.

    Returns:
        The matching User instance with relationships loaded, or None if not found.
    """
    result = await db.execute(_user_query().where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, data: UserCreate) -> User:
    """
    Create and persist a new user account with secure password hashing and role resolution.

    Steps performed:
    1. Verify email uniqueness (HTTP 409 if duplicate).
    2. Resolve system role:
       - If `role_id` provided: ensure role exists and is active.
       - If `role_id` omitted: automatically fallback to default 'EMPLOYEE' role.
    3. Validate 1:1 Employee link (if `employee_id` provided):
       - Ensure target Employee exists.
       - Ensure target Employee is not already linked to another user account.
    4. Hash plain password using bcrypt.
    5. Persist user and re-fetch with relationships loaded.

    Args:
        db: Async database session.
        data: Validated UserCreate schema.

    Returns:
        Newly created User instance with role and employee relationships loaded.

    Raises:
        HTTPException (409 Conflict): If the email is already registered.
        HTTPException (400 Bad Request): If role or employee ID is invalid or already linked.
    """
    # 1. Uniqueness check for email
    existing = await get_user_by_email(db, data.email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    # 2. Resolve role_id from database
    if data.role_id is not None:
        # Caller specified a role_id: verify it exists and is active
        role = await role_service.get_role_by_id(db, data.role_id)
        if role is None or not role.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role with ID {data.role_id} does not exist or is inactive.",
            )
        role_id = role.id
    else:
        # Caller omitted role_id (e.g. standard registration): default to EMPLOYEE role
        role = await role_service.get_role_by_name(db, "EMPLOYEE")
        role_id = role.id if role else 1

    # 3. Validate employee_id if provided (1:1 relationship enforcement)
    if data.employee_id is not None:
        from app.models.employee import Employee

        # Check if the employee record exists
        emp = await db.scalar(select(Employee).where(Employee.id == data.employee_id))
        if emp is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee with ID {data.employee_id} does not exist.",
            )

        # Enforce 1:1 constraint: check if this employee already has a linked user
        existing_emp_user = await db.scalar(select(User).where(User.employee_id == data.employee_id))
        if existing_emp_user is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee {data.employee_id} is already linked to user account {existing_emp_user.id}.",
            )

    # 4. Hash password securely using passlib bcrypt before storing
    user = User(
        employee_id=data.employee_id,
        email=data.email,
        password_hash=hash_password(data.password),
        role_id=role_id,
    )
    db.add(user)
    await db.flush()

    # 5. Re-fetch user with relationships (role, employee) eagerly loaded
    result = await get_user_by_id(db, user.id)
    assert result is not None
    return result

