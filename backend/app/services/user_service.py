import uuid
from typing import Dict

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate
from app.models.user import UserRole


# In-memory mock database
MOCK_DB: Dict[uuid.UUID, User] = {}

# Seed a default admin user for testing
default_id = uuid.uuid4()
MOCK_DB[default_id] = User(
    id=default_id,
    emp_id="EMP001",
    email="admin@peoplepay360.com",
    password_hash=hash_password("admin123"),
    role=UserRole.ADMIN,
    is_active=True
)


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Return the User with the given email, or None if not found."""
    for user in MOCK_DB.values():
        if user.email == email:
            return user
    return None


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    """Return the User with the given UUID, or None if not found."""
    if isinstance(user_id, str):
        user_id = uuid.UUID(user_id)
    return MOCK_DB.get(user_id)


async def create_user(db: AsyncSession, data: UserCreate) -> User:
    """
    Create and persist a new user in memory.
    """
    existing = await get_user_by_email(db, data.email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    new_id = uuid.uuid4()
    user = User(
        id=new_id,
        emp_id=data.emp_id,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        is_active=True
    )
    MOCK_DB[new_id] = user
    return user


