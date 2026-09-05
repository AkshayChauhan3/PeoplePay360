from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.salary_rule import ComputationType, SalaryRuleCategory


class SalaryRuleCreate(BaseModel):
    """Schema for creating a new salary rule within a salary structure."""

    salary_structure_id: int = Field(..., gt=0, description="ID of parent salary structure")
    name: str = Field(..., min_length=2, max_length=100, description="Rule display name (e.g. Basic Salary, HRA)")
    code: str = Field(..., min_length=1, max_length=50, description="Rule reference code (e.g. BASIC, HRA, GROSS, NET)")
    category: SalaryRuleCategory = Field(..., description="Rule category (BASIC, ALLOWANCE, GROSS, DEDUCTION, NET)")
    sequence: int = Field(..., ge=1, le=9999, description="Execution order sequence (ascending)")
    computation_type: ComputationType = Field(..., description="Calculation method (FIXED, PERCENTAGE, FORMULA)")

    fixed_amount: Decimal | None = Field(
        default=None,
        decimal_places=2,
        description="Fixed amount in currency units (required when computation_type is FIXED)",
    )
    percentage: Decimal | None = Field(
        default=None,
        ge=0,
        le=100,
        decimal_places=2,
        description="Percentage rate between 0.00 and 100.00 (required when computation_type is PERCENTAGE)",
    )
    percentage_base: str | None = Field(
        default=None,
        max_length=50,
        description="Base rule code to compute percentage against (required when computation_type is PERCENTAGE)",
    )
    formula: str | None = Field(
        default=None,
        max_length=255,
        description="Restricted mathematical formula (required when computation_type is FORMULA)",
    )
    is_active: bool = Field(default=True, description="Active status flag")

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("percentage_base")
    @classmethod
    def normalize_percentage_base(cls, v: str | None) -> str | None:
        return v.strip().upper() if v is not None and v.strip() else None

    @field_validator("formula")
    @classmethod
    def normalize_formula(cls, v: str | None) -> str | None:
        return v.strip() if v is not None and v.strip() else None

    @model_validator(mode="after")
    def validate_computation_type_fields(self) -> "SalaryRuleCreate":
        ctype = self.computation_type

        if ctype == ComputationType.FIXED:
            if self.fixed_amount is None:
                raise ValueError("fixed_amount is required when computation_type is FIXED")
            if self.percentage is not None or self.percentage_base is not None:
                raise ValueError("percentage and percentage_base must be null when computation_type is FIXED")
            if self.formula is not None:
                raise ValueError("formula must be null when computation_type is FIXED")

        elif ctype == ComputationType.PERCENTAGE:
            if self.percentage is None:
                raise ValueError("percentage is required when computation_type is PERCENTAGE")
            if not self.percentage_base:
                raise ValueError("percentage_base is required when computation_type is PERCENTAGE")
            if self.fixed_amount is not None:
                raise ValueError("fixed_amount must be null when computation_type is PERCENTAGE")
            if self.formula is not None:
                raise ValueError("formula must be null when computation_type is PERCENTAGE")

        elif ctype == ComputationType.FORMULA:
            if not self.formula:
                raise ValueError("formula is required when computation_type is FORMULA")
            if self.fixed_amount is not None:
                raise ValueError("fixed_amount must be null when computation_type is FORMULA")
            if self.percentage is not None or self.percentage_base is not None:
                raise ValueError("percentage and percentage_base must be null when computation_type is FORMULA")

        return self


class SalaryRuleUpdate(BaseModel):
    """Schema for updating an existing salary rule (PATCH semantics)."""

    name: str | None = Field(default=None, min_length=2, max_length=100)
    code: str | None = Field(default=None, min_length=1, max_length=50)
    category: SalaryRuleCategory | None = Field(default=None)
    sequence: int | None = Field(default=None, ge=1, le=9999)
    computation_type: ComputationType | None = Field(default=None)
    fixed_amount: Decimal | None = Field(default=None, decimal_places=2)
    percentage: Decimal | None = Field(default=None, ge=0, le=100, decimal_places=2)
    percentage_base: str | None = Field(default=None, max_length=50)
    formula: str | None = Field(default=None, max_length=255)
    is_active: bool | None = Field(default=None)

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str | None) -> str | None:
        return v.strip().upper() if v is not None else None

    @field_validator("percentage_base")
    @classmethod
    def normalize_percentage_base(cls, v: str | None) -> str | None:
        return v.strip().upper() if v is not None and v.strip() else None

    @field_validator("formula")
    @classmethod
    def normalize_formula(cls, v: str | None) -> str | None:
        return v.strip() if v is not None and v.strip() else None


class SalaryRuleResponse(BaseModel):
    """Full representation of a salary rule."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    salary_structure_id: int
    name: str
    code: str
    category: SalaryRuleCategory
    sequence: int
    computation_type: ComputationType
    fixed_amount: Decimal | None
    percentage: Decimal | None
    percentage_base: str | None
    formula: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SalaryRuleListResponse(BaseModel):
    """Paginated list of salary rules."""

    items: list[SalaryRuleResponse]
    total: int
    skip: int
    limit: int

