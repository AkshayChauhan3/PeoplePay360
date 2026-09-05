from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.payslip import PayslipStatus
from app.models.salary_rule import SalaryRuleCategory


class PayslipLineResponse(BaseModel):
    """Immutable snapshot of an evaluated salary rule within a payslip."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    payslip_id: int
    salary_rule_id: int | None
    code: str
    name: str
    category: SalaryRuleCategory
    sequence: int
    amount: Decimal
    created_at: datetime


class PayslipResponse(BaseModel):
    """Full detail view of an individual employee payslip with line items."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    payrun_id: int
    employee_id: UUID | int | str
    employee_name: str | None = None
    contract_id: int
    salary_structure_id: int
    period_start: date
    period_end: date
    status: PayslipStatus
    worked_days: Decimal
    gross_amount: Decimal
    deduction_amount: Decimal
    net_amount: Decimal
    lines: list[PayslipLineResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class PayslipListResponse(BaseModel):
    """Paginated collection of employee payslips."""

    items: list[PayslipResponse]
    total: int
    skip: int
    limit: int

