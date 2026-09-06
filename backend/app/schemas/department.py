from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DepartmentManagerSummary(BaseModel):
    """Public summary representation of a department manager."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_code: str
    first_name: str
    last_name: str
    full_name: str
    email: str
    job_title: str | None = None


class DepartmentCreate(BaseModel):
    """Schema for creating a new department."""

    name: str = Field(..., min_length=2, max_length=150, description="Department name")
    code: str = Field(..., min_length=2, max_length=50, description="Unique department code")
    description: str | None = Field(default=None, max_length=255, description="Department description")
    manager_id: int | None = Field(default=None, description="Employee ID of the department manager/head")

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
    manager_id: int | None = Field(default=None, description="Employee ID of the department manager/head")
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
    manager_id: int | None = None
    manager: DepartmentManagerSummary | None = None
    employee_count: int = 0
    is_active: bool
    created_at: datetime
    updated_at: datetime

