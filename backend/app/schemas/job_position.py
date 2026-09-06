from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class JobPositionCreate(BaseModel):
    """Schema for creating a new job position."""

    name: str = Field(..., min_length=2, max_length=150, description="Job position name")
    code: str = Field(..., min_length=2, max_length=50, description="Unique job position code")
    description: str | None = Field(default=None, max_length=255, description="Position description")
    department_id: int | None = Field(default=None, description="Optional owning department ID")

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        return v.strip()


class JobPositionUpdate(BaseModel):
    """Schema for updating an existing job position."""

    name: str | None = Field(default=None, min_length=2, max_length=150)
    code: str | None = Field(default=None, min_length=2, max_length=50)
    description: str | None = Field(default=None, max_length=255)
    department_id: int | None = Field(default=None, description="Owning department ID (set null to unassign)")
    is_active: bool | None = Field(default=None)

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str | None) -> str | None:
        return v.strip().upper() if v is not None else None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str | None) -> str | None:
        return v.strip() if v is not None else None


class JobPositionResponse(BaseModel):
    """Public representation of a job position."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    description: str | None
    department_id: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

