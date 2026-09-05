import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole


class UserCreate(BaseModel):
    """Schema for creating a new user account."""

    emp_id: uuid.UUID | None = Field(
        default=None,
        description="Optional link to an employee record (populated once Employee module is live)",
    )
    email: EmailStr = Field(..., description="Unique email address used for login")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Plaintext password (hashed before storage; never persisted or returned)",
    )
    role: UserRole = Field(default=UserRole.EMPLOYEE, description="User role")

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        """Require at least one digit and one uppercase letter."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        return v


class UserResponse(BaseModel):
    """Safe public representation of a user — never includes password fields."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    emp_id: uuid.UUID | None
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

