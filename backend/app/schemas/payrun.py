from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.payrun import PayrunStatus
from app.schemas.payslip import PayslipResponse


class PayrunPreviewRequest(BaseModel):
    """Wizard step 1: Request criteria to preview eligible and ineligible employees."""

    salary_structure_id: int = Field(
        ...,
        description="Salary Structure template ID to apply",
    )
    period_start: date = Field(
        ...,
        description="Start date of payroll accounting period",
    )
    period_end: date = Field(
        ...,
        description="End date of payroll accounting period",
    )

    @model_validator(mode="after")
    def validate_date_range(self) -> "PayrunPreviewRequest":
        if self.period_start > self.period_end:
            raise ValueError("period_start must be less than or equal to period_end")
        return self


class EligibleEmployeeItem(BaseModel):
    """Eligible employee item discovered by the payroll wizard."""

    employee_id: UUID | int | str
    employee_name: str
    employee_code: str
    contract_id: int
    wage: Decimal
    salary_structure_id: int
    salary_structure_name: str


class IneligibleEmployeeItem(BaseModel):
    """Ineligible employee item with explicit reason code/explanation."""

    employee_id: UUID | int | str
    employee_name: str
    employee_code: str
    reason: str


class PayrollWarningItem(BaseModel):
    """Payroll warning or blocking error item."""

    type: str = Field(..., description="'BLOCKING' or 'WARNING'")
    code: str = Field(..., description="Machine-readable code, e.g. 'DUPLICATE_PAYSLIP'")
    message: str = Field(..., description="Human-readable description")
    employee_id: UUID | int | str | None = None
    employee_name: str | None = None


class PayrunPreviewResponse(BaseModel):
    """Wizard step 1 output: Eligibility breakdown and validation warnings."""

    period_start: date
    period_end: date
    salary_structure_id: int
    salary_structure_name: str
    eligible_employees: list[EligibleEmployeeItem]
    ineligible_employees: list[IneligibleEmployeeItem]
    warnings: list[PayrollWarningItem]
    total_eligible: int
    total_ineligible: int


class PayrunCreate(BaseModel):
    """Wizard step 2: Confirmation payload to instantiate a new draft Payrun."""

    name: str = Field(..., min_length=1, max_length=100, description="Payrun batch title")
    salary_structure_id: int = Field(..., description="Salary Structure template ID")
    period_start: date = Field(..., description="Start date of payroll period")
    period_end: date = Field(..., description="End date of payroll period")
    employee_ids: list[UUID | int | str] | None = Field(
        default=None,
        description="Explicit subset of employee IDs to include. If omitted or empty, all eligible employees are included.",
    )

    @model_validator(mode="after")
    def validate_date_range(self) -> "PayrunCreate":
        if self.period_start > self.period_end:
            raise ValueError("period_start must be less than or equal to period_end")
        return self


class PayrollValidationResponse(BaseModel):
    """Result of audit validation on a COMPUTED payrun."""

    is_valid: bool
    can_proceed_to_validated: bool
    errors: list[PayrollWarningItem] = Field(default_factory=list)
    warnings: list[PayrollWarningItem] = Field(default_factory=list)


class PayrunResponse(BaseModel):
    """Payrun representation with financial totals and optional nested payslips."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    salary_structure_id: int
    salary_structure_name: str | None = None
    period_start: date
    period_end: date
    status: PayrunStatus
    created_by: int | None = None
    payslip_count: int = 0
    total_gross: Decimal = Decimal("0.00")
    total_deduction: Decimal = Decimal("0.00")
    total_net: Decimal = Decimal("0.00")
    payslips: list[PayslipResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class PayrunListResponse(BaseModel):
    """Paginated collection of payruns."""

    items: list[PayrunResponse]
    total: int
    skip: int
    limit: int

