from typing import Any
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Return the User with the given email from PostgreSQL database, or None if not found."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: Any) -> User | None:
    """Return the User with the given primary key from PostgreSQL database, or None if not found."""
    try:
        numeric_id = int(user_id)
    except (ValueError, TypeError):
        return None
    result = await db.execute(select(User).where(User.id == numeric_id))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, data: UserCreate) -> User:
    """
    Create and persist a new user account in PostgreSQL database.
    """
    existing = await get_user_by_email(db, data.email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    role_id = data.role_id if data.role_id is not None else 1

    from app.models.role import Role
    role_res = await db.execute(select(Role).where(Role.id == role_id))
    if role_res.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role with ID {role_id} does not exist.",
        )

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role_id=role_id,
        employee_id=data.employee_id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def seed_default_admin(db: AsyncSession) -> User:
    """Idempotently seed the default system administrator account."""
    admin_email = "admin@peoplepay360.com"
    existing = await get_user_by_email(db, admin_email)
    if existing is None:
        from app.models.role import Role
        res = await db.execute(select(Role).where(Role.name == "ADMIN"))
        admin_role = res.scalar_one_or_none()
        role_id = admin_role.id if admin_role else 5

        admin_user = User(
            email=admin_email,
            password_hash=hash_password("Admin@123"),
            role_id=role_id,
            is_active=True,
        )
        db.add(admin_user)
        await db.flush()
        return admin_user
    return existing
