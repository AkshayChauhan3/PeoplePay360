from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

class UserCreate(BaseModel):
    """Schema for creating a new user account."""

    role_id: int | None = Field(
        default=None,
        description="Role ID referencing the roles table (defaults to 1 / EMPLOYEE if omitted)",
    )
    employee_id: UUID | int | str | None = Field(
        default=None,
        description="Optional 1:1 link to an existing employee record",
    )
    email: EmailStr = Field(..., description="Unique email address used for login")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Plaintext password (hashed before storage; never persisted or returned)",
    )

    @field_validator("employee_id", "role_id", mode="before")
    @classmethod
    def sanitize_optional_ids(cls, v: Any) -> Any:
        if v == 0 or v == "0" or v == "":
            return None
        return v

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

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    employee_id: Any | None = None
    email: EmailStr
    role_id: int
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    @field_validator("role", mode="before")
    @classmethod
    def extract_role_name(cls, v: Any) -> str:
        if hasattr(v, "name"):
            return v.name
        return str(v)
