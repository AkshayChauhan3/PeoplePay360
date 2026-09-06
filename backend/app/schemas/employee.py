from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.employee import EmployeeStatus
from app.schemas.department import DepartmentResponse
from app.schemas.job_position import JobPositionResponse


class EmployeeSummaryResponse(BaseModel):
    """Minimal summary of an employee used in nested references (e.g. manager)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID | int | str
    employee_code: str
    first_name: str
    last_name: str
    email: EmailStr


class EmployeeCreate(BaseModel):
    """Schema for creating a new employee."""

    employee_code: str = Field(..., min_length=2, max_length=50, description="Unique employee code (e.g. EMP001)")
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr = Field(..., description="Unique employee work email")
    phone: str | None = Field(default=None, max_length=50)
    date_of_birth: date | None = Field(default=None)
    joining_date: date = Field(..., description="Date when the employee joined the company")
    department_id: int = Field(..., description="Referenced department ID")
    job_position_id: int = Field(..., description="Referenced job position ID")
    manager_id: UUID | int | str | None = Field(default=None, description="Optional manager employee ID")
    working_schedule_id: int | None = Field(default=None, description="Optional working schedule ID")
    user_id: int | None = Field(default=None, description="Optional User account ID to link to this employee")
    status: EmployeeStatus = Field(default=EmployeeStatus.ACTIVE, description="Initial employee status")
    bank_name: str | None = Field(default=None, max_length=100, description="Name of the employee's bank")
    bank_account_number: str | None = Field(default=None, max_length=50, description="Bank account number")
    ifsc_code: str | None = Field(default=None, max_length=20, description="Bank branch IFSC code")
    pan_number: str | None = Field(default=None, max_length=20, description="Permanent Account Number (PAN)")
    account_holder_name: str | None = Field(default=None, max_length=100, description="Beneficiary account holder name")

    @field_validator("manager_id", "working_schedule_id", "user_id", mode="before")
    @classmethod
    def sanitize_manager_and_schedule_id(cls, v: Any) -> Any:
        if v == 0 or v == "0" or v == "":
            return None
        return v

    @field_validator("employee_code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("first_name", "last_name")
    @classmethod
    def normalize_names(cls, v: str) -> str:
        return v.strip()

    @field_validator("ifsc_code", "pan_number")
    @classmethod
    def normalize_banking_codes(cls, v: str | None) -> str | None:
        return v.strip().upper() if v else None

    @field_validator("bank_account_number", "bank_name", "account_holder_name")
    @classmethod
    def normalize_banking_strings(cls, v: str | None) -> str | None:
        return v.strip() if v else None


class EmployeeUpdate(BaseModel):
    """Schema for updating an existing employee (PATCH semantics)."""

    employee_code: str | None = Field(default=None, min_length=2, max_length=50)
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = Field(default=None)
    phone: str | None = Field(default=None, max_length=50)
    date_of_birth: date | None = Field(default=None)
    joining_date: date | None = Field(default=None)
    department_id: int | None = Field(default=None)
    job_position_id: int | None = Field(default=None)
    manager_id: UUID | int | str | None = Field(default=None)
    working_schedule_id: int | None = Field(default=None)
    status: EmployeeStatus | None = Field(default=None)
    bank_name: str | None = Field(default=None, max_length=100)
    bank_account_number: str | None = Field(default=None, max_length=50)
    ifsc_code: str | None = Field(default=None, max_length=20)
    pan_number: str | None = Field(default=None, max_length=20)
    account_holder_name: str | None = Field(default=None, max_length=100)

    @field_validator("manager_id", "working_schedule_id", mode="before")
    @classmethod
    def sanitize_update_fks(cls, v: Any) -> Any:
        if v == 0 or v == "0" or v == "":
            return None
        return v

    @field_validator("employee_code")
    @classmethod
    def normalize_code(cls, v: str | None) -> str | None:
        return v.strip().upper() if v is not None else None

    @field_validator("first_name", "last_name")
    @classmethod
    def normalize_names(cls, v: str | None) -> str | None:
        return v.strip() if v is not None else None

    @field_validator("ifsc_code", "pan_number")
    @classmethod
    def normalize_banking_codes(cls, v: str | None) -> str | None:
        return v.strip().upper() if v else None

    @field_validator("bank_account_number", "bank_name", "account_holder_name")
    @classmethod
    def normalize_banking_strings(cls, v: str | None) -> str | None:
        return v.strip() if v else None


class EmployeeResponse(BaseModel):
    """Detailed employee response including nested relation snapshots."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID | int | str
    employee_code: str
    first_name: str
    last_name: str
    full_name: str
    email: EmailStr
    phone: str | None
    date_of_birth: date | None
    joining_date: date
    department_id: int
    job_position_id: int
    manager_id: UUID | int | str | None = None
    working_schedule_id: int | None = None
    user_id: int | None = None
    user_email: str | None = None
    status: EmployeeStatus
    bank_name: str | None = None
    bank_account_number: str | None = None
    ifsc_code: str | None = None
    pan_number: str | None = None
    account_holder_name: str | None = None

    department: DepartmentResponse | None = None
    job_position: JobPositionResponse | None = None
    manager: EmployeeSummaryResponse | None = None

    created_at: datetime
    updated_at: datetime


class EmployeeListResponse(BaseModel):
    """Paginated list response for employee queries."""

    items: list[EmployeeResponse]
    total: int
    skip: int
    limit: int


class LinkUserRequest(BaseModel):
    """Request payload to link an existing User to an Employee."""

    user_id: int = Field(..., description="ID of the User account to link")

