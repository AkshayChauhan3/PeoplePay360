"""
Payout Export & Banking Validation Schemas — PeoplePay360

Defines request/response models for auditing payroll bank account readiness
and exporting corporate bank payout files.
"""

from datetime import date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class MissingBankInfoEmployee(BaseModel):
    """Employee record missing essential banking details for direct bank transfer."""

    model_config = ConfigDict(from_attributes=True)

    employee_id: int = Field(..., description="Employee primary key ID")
    employee_code: str = Field(..., description="Unique employee code")
    employee_name: str = Field(..., description="Full name of employee")
    missing_fields: list[str] = Field(
        ...,
        description="List of missing bank fields, e.g. ['bank_account_number', 'ifsc_code']",
    )


class BankPayoutSummaryResponse(BaseModel):
    """Pre-disbursement audit summary indicating bank account readiness for a payrun."""

    model_config = ConfigDict(from_attributes=True)

    payrun_id: int = Field(..., description="ID of the target payrun")
    payrun_name: str = Field(..., description="Name of the payrun cycle")
    period_start: date = Field(..., description="Payrun cycle start date")
    period_end: date = Field(..., description="Payrun cycle end date")
    status: str = Field(..., description="Current status of the payrun (e.g. COMPUTED, VALIDATED, PAID)")
    total_employees: int = Field(..., description="Total employees with payslips in this payrun")
    total_payout_amount: Decimal = Field(..., description="Sum total net salary disbursed across all payslips")
    ready_for_payout_count: int = Field(..., description="Number of employees with complete bank details")
    missing_bank_details_count: int = Field(..., description="Number of employees missing bank details")
    can_export: bool = Field(
        ...,
        description="True if payrun is in a valid state (COMPUTED, VALIDATED, or PAID) with at least 1 payslip",
    )
    missing_employees: list[MissingBankInfoEmployee] = Field(
        default_factory=list,
        description="Detailed list of employees requiring bank details update",
    )
