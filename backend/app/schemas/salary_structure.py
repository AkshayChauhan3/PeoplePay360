from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.salary_rule import ComputationType, SalaryRuleCategory
from app.schemas.salary_rule import SalaryRuleResponse


class SalaryStructureCreate(BaseModel):
    """Schema for creating a new salary structure."""

    name: str = Field(..., min_length=2, max_length=100, description="Display name of the structure")
    code: str = Field(..., min_length=2, max_length=50, description="Unique uppercase code (e.g. BASE_STD)")
    description: str | None = Field(default=None, max_length=255, description="Optional description")
    is_active: bool = Field(default=True, description="Active status flag")

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        return v.strip().upper()


class SalaryStructureUpdate(BaseModel):
    """Schema for updating an existing salary structure (PATCH semantics)."""

    name: str | None = Field(default=None, min_length=2, max_length=100)
    code: str | None = Field(default=None, min_length=2, max_length=50)
    description: str | None = Field(default=None, max_length=255)
    is_active: bool | None = Field(default=None)

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str | None) -> str | None:
        return v.strip().upper() if v is not None else None


class SalaryStructureResponse(BaseModel):
    """Full representation of a salary structure with nested rules."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    rules: list[SalaryRuleResponse] = Field(default_factory=list)


class SalaryStructureListResponse(BaseModel):
    """Paginated list of salary structures."""

    items: list[SalaryStructureResponse]
    total: int
    skip: int
    limit: int


# ---------------------------------------------------------------------------
# Calculation Preview Schemas
# ---------------------------------------------------------------------------
class SalaryPreviewRequest(BaseModel):
    """Request payload for previewing calculation against a salary structure."""

    contract_wage: Decimal = Field(
        ...,
        gt=0,
        decimal_places=2,
        description="Agreed base remuneration from contract",
    )
    employee_id: UUID | int | str | None = Field(default=None, description="Optional employee context ID")
    contract_id: int | None = Field(default=None, description="Optional contract context ID")
    worked_days: int | None = Field(default=None, ge=0, description="Productive worked days")
    worked_minutes: int | None = Field(default=None, ge=0, description="Productive worked minutes")
    overtime_minutes: int | None = Field(default=None, ge=0, description="Overtime minutes")
    approved_time_off_days: Decimal | None = Field(default=None, ge=0, description="Approved leave days")
    approved_time_off_hours: Decimal | None = Field(default=None, ge=0, description="Approved leave hours")


class SalaryRuleResultResponse(BaseModel):
    """Calculated output for a single salary rule line."""

    rule_id: int
    code: str
    name: str
    category: SalaryRuleCategory
    sequence: int
    amount: Decimal
    computation_type: ComputationType
    formula_detail: str | None = None


class SalaryPreviewResponse(BaseModel):
    """Aggregated output from previewing salary calculation."""

    structure_id: int
    structure_name: str
    structure_code: str
    contract_wage: Decimal
    results: list[SalaryRuleResultResponse]
    totals_by_category: dict[str, Decimal]
    gross_amount: Decimal
    net_amount: Decimal

