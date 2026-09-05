from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.role import Role
from app.models.user import UserRole
from app.schemas.role import RoleCreate, RoleUpdate

DEFAULT_ROLES = [
    (UserRole.EMPLOYEE.value, "Standard employee with self-service access"),
    (UserRole.HR_MANAGER.value, "Human Resources Manager with employee and master data management"),
    (UserRole.HR_PAYROLL_USER.value, "HR Payroll Specialist with employee and payroll operations access"),
    (UserRole.HR_PAYROLL_MANAGER.value, "HR Payroll Manager with full HR and payroll operations access"),
    (UserRole.ADMIN.value, "System Administrator with full unrestricted access"),
]


async def seed_default_roles(db: AsyncSession) -> list[Role]:
    """Idempotently seed the 5 standard system roles into the database."""
    seeded: list[Role] = []
    for role_name, description in DEFAULT_ROLES:
        existing = await get_role_by_name(db, role_name)
        if existing is None:
            role = Role(name=role_name, description=description, is_active=True)
            db.add(role)
            seeded.append(role)
        else:
            seeded.append(existing)
    await db.flush()
    return seeded


async def get_roles(db: AsyncSession) -> list[Role]:
    """Return all roles ordered by ID."""
    result = await db.execute(select(Role).order_by(Role.id))
    return list(result.scalars().all())


async def get_role_by_id(db: AsyncSession, role_id: int) -> Role | None:
    """Return a role by its ID, or None."""
    result = await db.execute(select(Role).where(Role.id == role_id))
    return result.scalar_one_or_none()


async def get_role_by_name(db: AsyncSession, name: str) -> Role | None:
    """Return a role by its unique name, or None."""
    result = await db.execute(select(Role).where(Role.name == name))
    return result.scalar_one_or_none()


async def create_role(db: AsyncSession, data: RoleCreate) -> Role:
    """Create a new role, raising 409 on duplicate name."""
    existing = await get_role_by_name(db, data.name)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Role with name '{data.name}' already exists.",
        )
    role = Role(name=data.name, description=data.description)
    db.add(role)
    await db.flush()
    await db.refresh(role)
    return role


async def update_role(db: AsyncSession, role_id: int, data: RoleUpdate) -> Role:
    """Update role fields, raising 404 if not found or 409 on duplicate name."""
    role = await get_role_by_id(db, role_id)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {role_id} not found.",
        )

    if data.name is not None and data.name != role.name:
        existing = await get_role_by_name(db, data.name)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Role with name '{data.name}' already exists.",
            )
        role.name = data.name

    if data.description is not None:
        role.description = data.description
    if data.is_active is not None:
        role.is_active = data.is_active

    await db.flush()
    await db.refresh(role)
    return role

