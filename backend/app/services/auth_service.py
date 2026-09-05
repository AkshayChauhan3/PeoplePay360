from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import TokenResponse
from app.services.user_service import get_user_by_email, get_user_by_id

# Generic error used for all authentication failures.
# A single message prevents callers from inferring whether an email is registered.
_INVALID_CREDENTIALS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid credentials.",
    headers={"WWW-Authenticate": "Bearer"},
)

_INACTIVE_USER = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="Account is inactive.",
)


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    """
    Validate email + password and return the authenticated User.

    Raises:
        HTTPException 401 — on any credential mismatch (opaque message).
        HTTPException 403 — if the account is inactive.
    """
    user = await get_user_by_email(db, email)

    # Deliberate: same error whether email is missing OR password is wrong.
    if user is None or not verify_password(password, user.password_hash):
        raise _INVALID_CREDENTIALS

    if not user.is_active:
        raise _INACTIVE_USER

    return user


def build_token_response(user_id: str) -> TokenResponse:
    """Build an access + refresh token pair for the given user ID string."""
    return TokenResponse(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


async def refresh_tokens(db: AsyncSession, refresh_token: str) -> TokenResponse:
    """
    Validate a refresh token and return a fresh token pair.

    Raises:
        HTTPException 401 — if the token is invalid or expired.
        HTTPException 403 — if the user account is inactive.
    """
    invalid_token_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_refresh_token(refresh_token)
    except JWTError:
        raise invalid_token_error

    try:
        user_id = int(payload.sub)
    except (ValueError, TypeError):
        raise invalid_token_error

    user = await get_user_by_id(db, user_id)
    if user is None:
        raise invalid_token_error

    if not user.is_active:
        raise _INACTIVE_USER

    return build_token_response(str(user.id))

