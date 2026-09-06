"""
User Management API Router.

Provides endpoints for administrators to list, search, and inspect User accounts
for matching and linking with Employee workforce profiles.
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.dependencies.auth import require_master_data_admin
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "",
    response_model=list[UserResponse],
    summary="List user login accounts for employee linking",
)
async def list_users(
    unlinked_only: bool = Query(
        default=False,
        description="Filter to only users not currently linked to an employee record",
    ),
    search: str | None = Query(
        default=None,
        description="Search user accounts by email address",
    ),
    limit: int = Query(default=200, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_master_data_admin()),
) -> list[User]:
    """
    Retrieve user accounts with eager role and employee associations.

    Secured to Master Data Administrators and HR Managers.
    Supports filtering to unlinked accounts for assignment comboboxes.
    """
    query = (
        select(User)
        .options(
            selectinload(User.role),
            selectinload(User.employee),
        )
        .order_by(User.id.asc())
    )

    if unlinked_only:
        query = query.where(User.employee_id.is_(None))

    if search:
        query = query.where(User.email.ilike(f"%{search.strip()}%"))

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())
