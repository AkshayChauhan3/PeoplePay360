from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DepartmentCreate(BaseModel):
    """Schema for creating a new department."""

    name: str = Field(..., min_length=2, max_length=150, description="Department name")
    code: str = Field(..., min_length=2, max_length=50, description="Unique department code")
    description: str | None = Field(default=None, max_length=255, description="Department description")

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        return v.strip()


class DepartmentUpdate(BaseModel):
    """Schema for updating an existing department."""

    name: str | None = Field(default=None, min_length=2, max_length=150)
    code: str | None = Field(default=None, min_length=2, max_length=50)
    description: str | None = Field(default=None, max_length=255)
    is_active: bool | None = Field(default=None)

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str | None) -> str | None:
        return v.strip().upper() if v is not None else None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str | None) -> str | None:
        return v.strip() if v is not None else None


class DepartmentResponse(BaseModel):
    """Public representation of a department."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

