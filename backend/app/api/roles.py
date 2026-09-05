from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.role import Role
from app.models.user import User
from app.schemas.role import RoleResponse
from app.services import role_service

router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get(
    "",
    response_model=list[RoleResponse],
    summary="List all roles",
)
async def list_roles(
    db: AsyncSession = Depends(get_db),
) -> list[Role]:
    """Return all system roles. Public endpoint (no login required)."""
    return await role_service.get_roles(db)


@router.get(
    "/{role_id}",
    response_model=RoleResponse,
    summary="Get role by ID",
)
async def get_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
) -> Role:
    """Return a single role by its integer ID. Public endpoint (no login required)."""
    role = await role_service.get_role_by_id(db, role_id)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {role_id} not found.",
        )
    return role

