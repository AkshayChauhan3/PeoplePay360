"""
Authentication test suite — PeoplePay360 v0.0.1

15 test cases covering:
  - Registration (success, duplicate, password validation, role validation)
  - Password security (hashing, no plaintext in response)
  - Login (success, wrong password, inactive user)
  - JWT access token (valid, invalid, expired)
  - JWT refresh token (valid, invalid, expired)
  - Protected endpoints (authenticated, unauthenticated)
"""

from datetime import timedelta
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, create_refresh_token
from app.models.user import User


# ===========================================================================
# 1. Registration — success
# ===========================================================================

async def test_register_success(async_client: AsyncClient) -> None:
    response = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "new@example.com", "password": "NewPass1", "role": "EMPLOYEE"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new@example.com"
    assert body["role"] == "EMPLOYEE"
    assert body["is_active"] is True
    assert "id" in body


# ===========================================================================
# 2. Registration — duplicate email → 409
# ===========================================================================

async def test_register_duplicate_email(async_client: AsyncClient, registered_user: dict[str, Any]) -> None:
    response = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "test@example.com", "password": "AnotherPass1", "role": "EMPLOYEE"},
    )
    assert response.status_code == 409


# ===========================================================================
# 3. Password stored as bcrypt hash, not plaintext
# ===========================================================================

async def test_password_is_hashed(
    async_client: AsyncClient,
    db_session: AsyncSession,
    registered_user: dict[str, Any],
) -> None:
    result = await db_session.execute(
        select(User).where(User.email == "test@example.com")
    )
    user = result.scalar_one()
    assert user.password_hash != "TestPass1"
    assert user.password_hash.startswith("$2b$")  # bcrypt hash prefix


# ===========================================================================
# 4. password_hash never returned in API response
# ===========================================================================

async def test_register_no_password_in_response(async_client: AsyncClient) -> None:
    response = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "safe@example.com", "password": "SafePass1", "role": "HR_MANAGER"},
    )
    assert response.status_code == 201
    body = response.json()
    assert "password" not in body
    assert "password_hash" not in body


# ===========================================================================
# 5. Login — correct credentials → token pair returned
# ===========================================================================

async def test_login_success(async_client: AsyncClient, registered_user: dict[str, Any]) -> None:
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "TestPass1"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


# ===========================================================================
# 6. Login — wrong password → 401
# ===========================================================================

async def test_login_wrong_password(async_client: AsyncClient, registered_user: dict[str, Any]) -> None:
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "WrongPass1"},
    )
    assert response.status_code == 401


# ===========================================================================
# 7. Inactive user cannot login → 403
# ===========================================================================

async def test_login_inactive_user(
    async_client: AsyncClient,
    db_session: AsyncSession,
    registered_user: dict[str, Any],
) -> None:
    # Deactivate the user directly in the DB
    result = await db_session.execute(
        select(User).where(User.email == "test@example.com")
    )
    user = result.scalar_one()
    user.is_active = False
    await db_session.flush()

    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "TestPass1"},
    )
    assert response.status_code == 403


# ===========================================================================
# 8. Valid JWT on /auth/me → 200
# ===========================================================================

async def test_me_with_valid_token(
    async_client: AsyncClient,
    auth_tokens: dict[str, str],
) -> None:
    response = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {auth_tokens['access_token']}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "test@example.com"
    assert "password_hash" not in body


# ===========================================================================
# 9. Invalid JWT → 401
# ===========================================================================

async def test_me_with_invalid_token(async_client: AsyncClient) -> None:
    response = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer this.is.not.a.valid.token"},
    )
    assert response.status_code == 401


# ===========================================================================
# 10. Expired JWT → 401
# ===========================================================================

async def test_me_with_expired_token(
    async_client: AsyncClient,
    registered_user: dict[str, Any],
) -> None:
    from jose import jwt
    from app.core.config import settings
    from datetime import datetime, timezone

    expired_token = jwt.encode(
        {
            "sub": registered_user["id"],
            "type": "access",
            "exp": datetime(2000, 1, 1, tzinfo=timezone.utc),
        },
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )
    response = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401


# ===========================================================================
# 11. Invalid role in registration → 422
# ===========================================================================

async def test_register_invalid_role(async_client: AsyncClient) -> None:
    response = await async_client.post(
        "/api/v1/auth/register",
        json={"email": "badrole@example.com", "password": "ValidPass1", "role": "SUPERUSER"},
    )
    assert response.status_code == 422


# ===========================================================================
# 12. Unauthenticated request to protected endpoint → 401
# ===========================================================================

async def test_me_unauthenticated(async_client: AsyncClient) -> None:
    response = await async_client.get("/api/v1/auth/me")
    assert response.status_code == 401


# ===========================================================================
# 13. Valid refresh token → new token pair
# ===========================================================================

async def test_refresh_with_valid_token(
    async_client: AsyncClient,
    auth_tokens: dict[str, str],
) -> None:
    response = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": auth_tokens["refresh_token"]},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body
    # New tokens should differ from the originals
    assert body["access_token"] != auth_tokens["access_token"]


# ===========================================================================
# 14. Invalid refresh token → 401
# ===========================================================================

async def test_refresh_with_invalid_token(async_client: AsyncClient) -> None:
    response = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "this.is.garbage"},
    )
    assert response.status_code == 401


# ===========================================================================
# 15. Expired refresh token → 401
# ===========================================================================

async def test_refresh_with_expired_token(
    async_client: AsyncClient,
    registered_user: dict[str, Any],
) -> None:
    from jose import jwt
    from app.core.config import settings
    from datetime import datetime, timezone

    expired_refresh = jwt.encode(
        {
            "sub": registered_user["id"],
            "type": "refresh",
            "exp": datetime(2000, 1, 1, tzinfo=timezone.utc),
        },
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )
    response = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": expired_refresh},
    )
    assert response.status_code == 401

