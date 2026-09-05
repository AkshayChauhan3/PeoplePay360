import uuid
from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.user import User, UserRole
from app.services.user_service import get_user_by_id

_bearer_scheme = HTTPBearer(auto_error=False)

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials.",
    headers={"WWW-Authenticate": "Bearer"},
)

_INACTIVE = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Account is inactive.",
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency: decode the Bearer token and return the authenticated User.

    Usage:
        async def endpoint(user: User = Depends(get_current_user)): ...

    Raises:
        401 — missing / invalid / expired token.
        403 — token is valid but user account is inactive.
    """
    if credentials is None:
        raise _UNAUTHORIZED

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = uuid.UUID(payload.sub)
    except (JWTError, ValueError):
        raise _UNAUTHORIZED

    user = await get_user_by_id(db, user_id)
    if user is None:
        raise _UNAUTHORIZED

    if not user.is_active:
        raise _INACTIVE

    return user


def require_role(*roles: UserRole) -> Callable:
    """
    Dependency factory that enforces role-based access control.

    Usage:
        async def endpoint(
            user: User = Depends(require_role(UserRole.ADMIN, UserRole.HR_MANAGER))
        ): ...

    Returns a FastAPI-compatible dependency callable.
    Raises 403 if the authenticated user's role is not in the allowed set.
    """

    async def _check_role(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return _check_role

