from datetime import datetime, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ScheduleLineIn(BaseModel):
    """Schema for defining a single day's shift line within a schedule."""

    day_of_week: int = Field(
        ...,
        ge=0,
        le=6,
        description="0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday",
    )
    start_time: time = Field(..., description="Scheduled shift start time (e.g. 09:00:00)")
    end_time: time = Field(..., description="Scheduled shift end time (e.g. 18:00:00)")
    break_minutes: int = Field(default=60, ge=0, description="Unpaid break duration in minutes")


class ScheduleLineOut(BaseModel):
    """Public representation of a working schedule line."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    day_of_week: int
    start_time: time
    end_time: time
    break_minutes: int
    work_hours: Decimal


class ScheduleIn(BaseModel):
    """Payload for creating or configuring a working schedule."""

    name: str = Field(..., min_length=2, max_length=100, description="Schedule name (e.g. 'Standard 40h')")
    calendar_type: str = Field(default="STANDARD", max_length=50)
    lines: list[ScheduleLineIn] = Field(default_factory=list, description="Working day lines")


class ScheduleOut(BaseModel):
    """Public representation of a working schedule."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    calendar_type: str
    hours_per_week: Decimal
    days_per_week: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    lines: list[ScheduleLineOut] = []

