from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Credentials submitted by a client during login."""

    email: EmailStr
    password: str = Field(..., min_length=1)


class RefreshRequest(BaseModel):
    """Refresh token submitted to obtain a new token pair."""

    refresh_token: str = Field(..., description="A valid, unexpired refresh JWT")


class TokenResponse(BaseModel):
    """Token pair returned after a successful login or refresh."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Internal representation of decoded JWT claims — not exposed via API."""

    sub: str          # user UUID as string
    type: str         # "access" or "refresh"
    exp: int          # Unix timestamp

