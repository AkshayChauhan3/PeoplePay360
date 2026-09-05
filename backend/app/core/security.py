from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt
import bcrypt

from app.core.config import settings
from app.schemas.auth import TokenPayload

# ---------------------------------------------------------------------------
# Password hashing (using bcrypt directly for Python 3.12+ / bcrypt 4.0+ stability)
# ---------------------------------------------------------------------------


def hash_password(plain_password: str) -> str:
    """Return a bcrypt hash of the given plaintext password."""
    pwd_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if the plaintext password matches the stored hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

_ACCESS_TOKEN_TYPE = "access"
_REFRESH_TOKEN_TYPE = "refresh"


def _build_token(subject: str, token_type: str, expires_delta: timedelta) -> str:
    """Encode a signed JWT with the given subject, type claim, and expiry."""
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str) -> str:
    """Create a short-lived JWT access token for the given user ID."""
    delta = timedelta(minutes=settings.access_token_expire_minutes)
    return _build_token(subject, _ACCESS_TOKEN_TYPE, delta)


def create_refresh_token(subject: str) -> str:
    """Create a long-lived JWT refresh token for the given user ID."""
    delta = timedelta(days=settings.refresh_token_expire_days)
    return _build_token(subject, _REFRESH_TOKEN_TYPE, delta)


def _decode_token(token: str, expected_type: str) -> TokenPayload:
    """
    Decode and validate a JWT.

    Raises JWTError (re-raised by callers as HTTP 401) if:
    - Signature is invalid
    - Token is expired
    - Token type does not match expected_type
    """
    payload = jwt.decode(
        token,
        settings.secret_key,
        algorithms=[settings.jwt_algorithm],
    )
    token_type: str | None = payload.get("type")
    if token_type != expected_type:
        raise JWTError(f"Invalid token type: expected '{expected_type}', got '{token_type}'")

    return TokenPayload(
        sub=payload["sub"],
        type=token_type,
        exp=payload["exp"],
    )


def decode_access_token(token: str) -> TokenPayload:
    """Decode and validate a JWT access token."""
    return _decode_token(token, _ACCESS_TOKEN_TYPE)


def decode_refresh_token(token: str) -> TokenPayload:
    """Decode and validate a JWT refresh token."""
    return _decode_token(token, _REFRESH_TOKEN_TYPE)

