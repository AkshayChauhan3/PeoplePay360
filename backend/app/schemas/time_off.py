"""
Time Off Schemas — PeoplePay360

Pydantic v2 schemas for:
- TimeOffType (create, update, response)
- TimeOffAllocation (create, update, response)
- TimeOffRequest (create, update, response, approval/refusal)
- TimeOffBalance (live leave entitlement and consumption summaries)
"""

from datetime import date, datetime
from decimal import Decimal
from typing import Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.time_off import (
    AllocationStatus,
    TimeOffRequestStatus,
    TimeOffUnit,
)


# ===========================================================================
# 1. TIME OFF TYPE SCHEMAS
# ===========================================================================

class TimeOffTypeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Unique leave type name")
    code: str = Field(..., min_length=1, max_length=50, description="Short unique code (e.g. PTO, SICK)")
    description: str | None = Field(None, max_length=255)
    unit: TimeOffUnit = Field(default=TimeOffUnit.DAYS, description="Duration unit (DAYS or HOURS)")
    requires_allocation: bool = Field(default=True, description="Whether an allocation grant is required")
    approval_required: bool = Field(default=True, description="Whether requests require HR/manager approval")
    payroll_integration: bool = Field(default=True, description="Whether this leave integrates with payroll")
    is_active: bool = Field(default=True, description="Active status")

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        return v.strip()


class TimeOffTypeCreate(TimeOffTypeBase):
    pass


class TimeOffTypeUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    code: str | None = Field(None, min_length=1, max_length=50)
    description: str | None = Field(None, max_length=255)
    unit: TimeOffUnit | None = None
    requires_allocation: bool | None = None
    approval_required: bool | None = None
    payroll_integration: bool | None = None
    is_active: bool | None = None

    @field_validator("code")
    @classmethod
    def normalize_code(cls, v: str | None) -> str | None:
        return v.strip().upper() if v is not None else None

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str | None) -> str | None:
        return v.strip() if v is not None else None


class TimeOffTypeResponse(TimeOffTypeBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ===========================================================================
# 2. TIME OFF ALLOCATION SCHEMAS
# ===========================================================================

class TimeOffAllocationCreate(BaseModel):
    employee_id: UUID | int | str = Field(..., description="Target employee receiving allocation")
    time_off_type_id: int = Field(..., description="Leave type ID")
    allocation_quantity: Decimal = Field(..., gt=0, description="Total days or hours allocated")
    valid_from: date = Field(..., description="Entitlement start date")
    valid_to: date = Field(..., description="Entitlement expiration date")
    notes: str | None = Field(None, max_length=255)

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.valid_to < self.valid_from:
            raise ValueError("valid_to cannot be earlier than valid_from.")
        return self


class TimeOffAllocationUpdate(BaseModel):
    allocation_quantity: Decimal | None = Field(None, gt=0)
    valid_from: date | None = None
    valid_to: date | None = None
    status: AllocationStatus | None = None
    notes: str | None = Field(None, max_length=255)

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.valid_from is not None and self.valid_to is not None:
            if self.valid_to < self.valid_from:
                raise ValueError("valid_to cannot be earlier than valid_from.")
        return self


class TimeOffAllocationResponse(BaseModel):
    id: int
    employee_id: UUID | int | str
    time_off_type_id: int
    allocation_quantity: Decimal
    consumed_quantity: Decimal
    remaining_quantity: float
    valid_from: date
    valid_to: date
    status: AllocationStatus
    notes: str | None
    time_off_type: TimeOffTypeResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ===========================================================================
# 3. TIME OFF REQUEST SCHEMAS
# ===========================================================================

class TimeOffRequestCreate(BaseModel):
    time_off_type_id: int = Field(..., description="Leave type ID")
    employee_id: UUID | int | str | None = Field(None, description="Employee ID (omitted for self-service)")
    allocation_id: int | None = Field(None, description="Optional specific allocation; resolved automatically if omitted")
    start_date: date = Field(..., description="First day of leave")
    end_date: date = Field(..., description="Last day of leave (inclusive)")
    requested_quantity: Decimal | None = Field(None, gt=0, description="Optional explicit duration (e.g. 0.5 for half day, or specific hours)")
    reason: str | None = Field(None, max_length=255, description="Reason for leave request")

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.end_date < self.start_date:
            raise ValueError("end_date cannot be earlier than start_date.")
        return self


class TimeOffRequestUpdate(BaseModel):
    start_date: date | None = None
    end_date: date | None = None
    requested_quantity: Decimal | None = Field(None, gt=0)
    reason: str | None = Field(None, max_length=255)

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if self.start_date is not None and self.end_date is not None:
            if self.end_date < self.start_date:
                raise ValueError("end_date cannot be earlier than start_date.")
        return self


class TimeOffRequestRefuse(BaseModel):
    refusal_reason: str = Field(..., min_length=1, max_length=255, description="Mandatory reason for refusing request")


class TimeOffRequestResponse(BaseModel):
    id: int
    employee_id: UUID | int | str
    time_off_type_id: int
    allocation_id: int | None
    start_date: date
    end_date: date
    requested_quantity: Decimal
    reason: str | None
    status: TimeOffRequestStatus
    approved_by: int | None
    approved_at: datetime | None
    refusal_reason: str | None
    time_off_type: TimeOffTypeResponse | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ===========================================================================
# 4. BALANCE SCHEMAS
# ===========================================================================

class TimeOffBalanceItem(BaseModel):
    time_off_type_id: int
    time_off_type_name: str
    time_off_type_code: str
    unit: TimeOffUnit
    requires_allocation: bool
    total_allocated: float
    total_consumed: float
    total_remaining: float
    allocations: list[TimeOffAllocationResponse] = []


class TimeOffBalanceResponse(BaseModel):
    employee_id: UUID | int | str
    balances: list[TimeOffBalanceItem]

