from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from app.schemas.user import UserCreate, UserResponse
from app.services.auth_service import authenticate_user, build_token_response, refresh_tokens
from app.services.user_service import create_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Create a new user account.

    - Validates input (email format, password strength, valid role).
    - Rejects duplicate emails with 409.
    - Hashes the password before storage.
    - Returns safe user data — password is never included.
    """
    return await create_user(db, data)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive a token pair",
)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Log in with email and password.

    - Returns an access token (short-lived) and a refresh token (long-lived).
    - Returns a generic 401 for any credential failure (no email-existence leakage).
    - Returns 403 if the account is inactive.
    """
    user = await authenticate_user(db, data.email, data.password)
    return build_token_response(str(user.id))


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh an access token using a refresh token",
)
async def refresh(
    data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Exchange a valid refresh token for a new access + refresh token pair.

    - Returns 401 if the refresh token is invalid or expired.
    - Returns 403 if the user account is inactive.
    """
    return await refresh_tokens(db, data.refresh_token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Return the currently authenticated user",
)
async def me(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Return the profile of the currently authenticated user.

    Requires a valid Bearer access token.
    Password hash is never included in the response.
    """
    return current_user

