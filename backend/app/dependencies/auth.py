"""
Authentication & Role-Based Access Control (RBAC) Dependencies.

FastAPI uses dependency injection (`Depends(...)`) to enforce security policies
prior to executing route handlers. This module provides:
1. `get_current_user`: Decodes the incoming Bearer JWT, fetches the user from the DB,
   verifies active status, and injects the authenticated `User` into the endpoint.
2. `require_role(*roles)`: Higher-order dependency factory that verifies the authenticated
   user holds one of the specified allowed roles (HTTP 403 Forbidden if not).
3. Pre-composed permission bundles (`require_hr_management`, `require_master_data_admin`, `require_admin`).
"""

from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.database import get_db
from app.models.user import User, UserRole
from app.services.user_service import get_user_by_id

# ---------------------------------------------------------------------------
# Bearer Token Scheme
# ---------------------------------------------------------------------------
# auto_error=False allows us to customize the 401 error response payload
# and headers consistently, rather than relying on FastAPI's default messages.
# This scheme also powers the green "Authorize" button in OpenAPI / Swagger UI.
_bearer_scheme = HTTPBearer(auto_error=False)

# Reusable HTTP 401 exception with WWW-Authenticate header per RFC 6750
_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials.",
    headers={"WWW-Authenticate": "Bearer"},
)

# Reusable HTTP 403 exception for deactivated accounts
_INACTIVE = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Account is inactive.",
)


# ---------------------------------------------------------------------------
# Current User Dependency
# ---------------------------------------------------------------------------
async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency: validate the Bearer token and return the authenticated User.

    Execution Flow:
    1. Extract the Bearer token from the Authorization header.
    2. Decode the JWT and verify signature, expiry, and token type ('access').
    3. Extract the `sub` claim (user ID integer).
    4. Fetch the User from PostgreSQL with role relationship loaded.
    5. Verify the user exists and account is active.

    Usage in route handlers:
        @router.get("/profile")
        async def my_profile(user: User = Depends(get_current_user)):
            return user
    """
    if credentials is None:
        raise _UNAUTHORIZED

    try:
        # Decode and validate the JWT access token signature & expiration
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload.sub)
    except (JWTError, ValueError, TypeError):
        raise _UNAUTHORIZED

    # Look up user in database with associated role eagerly loaded
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise _UNAUTHORIZED

    # Guard against deactivated user accounts
    if not user.is_active:
        raise _INACTIVE

    return user


# ---------------------------------------------------------------------------
# RBAC Dependency Factory
# ---------------------------------------------------------------------------
def require_role(*roles: UserRole | str) -> Callable:
    """
    Factory creating a FastAPI dependency that checks user roles.

    Accepts either `UserRole` enum members or string names.
    Returns a callable suitable for `Depends()`.

    Usage:
        @router.post("/departments", dependencies=[Depends(require_role(UserRole.ADMIN))])
        async def create_dept(...):
            ...
    """
    # Normalize allowed roles into a set of uppercase string names
    allowed = {r.value if hasattr(r, "value") else str(r) for r in roles}

    async def _check_role(current_user: User = Depends(get_current_user)) -> User:
        user_role_name = current_user.role_name
        if user_role_name not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return _check_role


# ---------------------------------------------------------------------------
# Standard Role Bundles
# ---------------------------------------------------------------------------
def require_hr_management() -> Callable:
    """
    Allows roles that manage employee lifecycle records:
    - ADMIN
    - HR_MANAGER
    - HR_PAYROLL_USER
    - HR_PAYROLL_MANAGER
    """
    return require_role(
        UserRole.ADMIN,
        UserRole.HR_MANAGER,
        UserRole.HR_PAYROLL_USER,
        UserRole.HR_PAYROLL_MANAGER,
    )


def require_master_data_admin() -> Callable:
    """
    Allows roles that manage master configuration (departments, positions, roles):
    - ADMIN
    - HR_MANAGER
    - HR_PAYROLL_MANAGER
    """
    return require_role(
        UserRole.ADMIN,
        UserRole.HR_MANAGER,
        UserRole.HR_PAYROLL_MANAGER,
    )


def require_admin() -> Callable:
    """
    Restricts access strictly to system ADMIN accounts.
    """
    return require_role(UserRole.ADMIN)


def require_payroll_read() -> Callable:
    """
    Allows read-only access to salary structures and rules:
    - ADMIN
    - HR_MANAGER
    - HR_PAYROLL_MANAGER
    - HR_PAYROLL_USER
    """
    return require_role(
        UserRole.ADMIN,
        UserRole.HR_MANAGER,
        UserRole.HR_PAYROLL_MANAGER,
        UserRole.HR_PAYROLL_USER,
    )


def require_payroll_manager() -> Callable:
    """
    Allows full configuration access to salary structures and rules:
    - ADMIN
    - HR_PAYROLL_MANAGER
    """
    return require_role(
        UserRole.ADMIN,
        UserRole.HR_PAYROLL_MANAGER,
    )

