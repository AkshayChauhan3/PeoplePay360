from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.attendance import AttendanceStatus


class AttendanceCheckInRequest(BaseModel):
    """Payload for employee check-in."""

    timestamp: datetime | None = Field(
        default=None,
        description="Optional check-in timestamp (defaults to server UTC now)",
    )


class AttendanceCheckOutRequest(BaseModel):
    """Payload for employee check-out."""

    timestamp: datetime | None = Field(
        default=None,
        description="Optional check-out timestamp (defaults to server UTC now)",
    )


class AttendanceCreate(BaseModel):
    """Payload for manual attendance creation by HR or Admin."""

    employee_id: int = Field(..., description="ID of employee")
    attendance_date: date = Field(..., description="Calendar date of attendance")
    check_in: datetime = Field(..., description="Timezone-aware check-in datetime")
    check_out: datetime | None = Field(default=None, description="Timezone-aware check-out datetime")
    correction_reason: str | None = Field(
        default=None,
        max_length=255,
        description="Reason or note explaining manual creation",
    )


class AttendanceUpdate(BaseModel):
    """Payload for correcting an existing attendance record (requires audit reason)."""

    check_in: datetime | None = Field(default=None, description="Updated check-in datetime")
    check_out: datetime | None = Field(default=None, description="Updated check-out datetime")
    correction_reason: str = Field(
        ...,
        min_length=3,
        max_length=255,
        description="Mandatory audit reason for manual correction",
    )


class AttendanceResponse(BaseModel):
    """Public representation of an attendance record with derived metrics."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: str | None = None
    attendance_date: date
    check_in: datetime
    check_out: datetime | None = None
    worked_minutes: int
    late_minutes: int
    overtime_minutes: int
    status: AttendanceStatus
    is_manual_edit: bool
    correction_reason: str | None = None
    elapsed_hours: float | None = None
    net_hours: float = 0.0
    late_hours: float = 0.0
    overtime_hours: float = 0.0
    created_at: datetime
    updated_at: datetime


class AttendanceSessionResponse(BaseModel):
    """Status of the current user's active attendance session (for UI Header widget)."""

    has_active_session: bool
    session_id: int | None = None
    check_in_time: datetime | None = None
    elapsed_seconds: int | None = None


class AttendanceListResponse(BaseModel):
    """Paginated response for attendance lists."""

    items: list[AttendanceResponse]
    total: int
    skip: int
    limit: int

