from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.contract import ContractStatus
from app.schemas.department import DepartmentResponse
from app.schemas.employee import EmployeeSummaryResponse
from app.schemas.job_position import JobPositionResponse


class ContractCreate(BaseModel):
    """Schema for creating a new employment contract."""

    employee_id: int = Field(..., gt=0, description="ID of the employee")
    contract_number: str = Field(
        ...,
        min_length=2,
        max_length=50,
        description="Unique contract reference code (e.g. CNT-2026-0001)",
    )
    start_date: date = Field(..., description="Contract effective start date")
    end_date: date | None = Field(
        default=None,
        description="Contract end date. Null indicates a permanent or open-ended contract.",
    )
    wage: Decimal = Field(
        ...,
        gt=0,
        decimal_places=2,
        description="Financial compensation / wage (must be strictly greater than 0)",
    )
    department_id: int | None = Field(
        default=None,
        description="Optional department ID. Defaults to employee's assigned department if omitted.",
    )
    job_position_id: int | None = Field(
        default=None,
        description="Optional job position ID. Defaults to employee's assigned job position if omitted.",
    )
    salary_structure_id: int | None = Field(
        default=None,
        description="Reserved for future salary structure engine.",
    )
    status: ContractStatus = Field(
        default=ContractStatus.DRAFT,
        description="Initial lifecycle status (DRAFT or RUNNING)",
    )

    @field_validator("department_id", "job_position_id", "salary_structure_id", mode="before")
    @classmethod
    def sanitize_optional_ids(cls, v: Any) -> Any:
        """Handle Swagger UI default 0s or empty string inputs gracefully."""
        if v == 0 or v == "0" or v == "":
            return None
        return v

    @field_validator("contract_number")
    @classmethod
    def normalize_contract_number(cls, v: str) -> str:
        """Strip whitespace and normalize contract numbers to uppercase."""
        return v.strip().upper()

    @model_validator(mode="after")
    def validate_date_range(self) -> "ContractCreate":
        """Ensure end_date is not earlier than start_date."""
        if self.end_date is not None and self.end_date < self.start_date:
            raise ValueError("end_date cannot be earlier than start_date")
        return self


class ContractUpdate(BaseModel):
    """Schema for partially updating an existing contract (PATCH semantics)."""

    contract_number: str | None = Field(default=None, min_length=2, max_length=50)
    start_date: date | None = Field(default=None)
    end_date: date | None = Field(default=None)
    wage: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    department_id: int | None = Field(default=None)
    job_position_id: int | None = Field(default=None)
    salary_structure_id: int | None = Field(default=None)
    status: ContractStatus | None = Field(default=None)

    @field_validator("department_id", "job_position_id", "salary_structure_id", mode="before")
    @classmethod
    def sanitize_optional_ids(cls, v: Any) -> Any:
        if v == 0 or v == "0" or v == "":
            return None
        return v

    @field_validator("contract_number")
    @classmethod
    def normalize_contract_number(cls, v: str | None) -> str | None:
        return v.strip().upper() if v is not None else None

    @model_validator(mode="after")
    def validate_date_range(self) -> "ContractUpdate":
        if self.start_date is not None and self.end_date is not None:
            if self.end_date < self.start_date:
                raise ValueError("end_date cannot be earlier than start_date")
        return self


class ContractResponse(BaseModel):
    """Full contract response including nested employee, department, and position data."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    contract_number: str
    employee_id: int
    department_id: int
    job_position_id: int
    salary_structure_id: int | None
    start_date: date
    end_date: date | None
    wage: Decimal
    status: ContractStatus
    created_at: datetime
    updated_at: datetime

    # Nested snapshots
    employee: EmployeeSummaryResponse
    department: DepartmentResponse
    job_position: JobPositionResponse


class ContractListResponse(BaseModel):
    """Paginated list of contracts."""

    items: list[ContractResponse]
    total: int
    skip: int
    limit: int
