from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RoleCreate(BaseModel):
    """Schema for creating a new role."""

    name: str = Field(..., min_length=2, max_length=100, description="Unique role identifier")
    description: str | None = Field(default=None, max_length=255, description="Role description")


class RoleUpdate(BaseModel):
    """Schema for updating an existing role."""

    name: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=255)
    is_active: bool | None = Field(default=None)


class RoleResponse(BaseModel):
    """Public representation of a system role."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

