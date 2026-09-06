from datetime import datetime, time, timezone
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Time,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _utcnow() -> datetime:
    """Helper returning current timestamp in UTC timezone."""
    return datetime.now(timezone.utc)


class WorkingSchedule(Base):
    """
    Working Schedule Entity.

    Defines standard organizational or employee-specific work calendars,
    specifying expected working days and standard shifts across the week.
    """

    __tablename__ = "working_schedules"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )

    calendar_type: Mapped[str] = mapped_column(
        String(50),
        default="STANDARD",
        server_default="STANDARD",
        nullable=False,
    )

    hours_per_week: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        default=Decimal("40.00"),
        server_default="40.00",
        nullable=False,
    )

    days_per_week: Mapped[int] = mapped_column(
        Integer,
        default=5,
        server_default="5",
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        server_default=text("now()"),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        onupdate=_utcnow,
        server_default=text("now()"),
        nullable=False,
    )

    # 1:N relationship with day lines
    lines: Mapped[list["WorkingScheduleDay"]] = relationship(
        "WorkingScheduleDay",
        back_populates="schedule",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="WorkingScheduleDay.day_of_week",
    )

    def __repr__(self) -> str:
        return f"<WorkingSchedule id={self.id} name={self.name!r} hours={self.hours_per_week}>"


class WorkingScheduleDay(Base):
    """
    Daily working line within a Working Schedule.

    Maps day of week (0 = Monday ... 6 = Sunday) to shift timings and breaks.
    """

    __tablename__ = "working_schedule_days"
    __table_args__ = (
        UniqueConstraint(
            "schedule_id",
            "day_of_week",
            name="uq_working_schedule_days_schedule_day",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    schedule_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("working_schedules.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # 0 = Monday, 1 = Tuesday, 2 = Wednesday, 3 = Thursday, 4 = Friday, 5 = Saturday, 6 = Sunday
    day_of_week: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    start_time: Mapped[time] = mapped_column(
        Time,
        nullable=False,
    )

    end_time: Mapped[time] = mapped_column(
        Time,
        nullable=False,
    )

    break_minutes: Mapped[int] = mapped_column(
        Integer,
        default=60,
        server_default="60",
        nullable=False,
    )

    work_hours: Mapped[Decimal] = mapped_column(
        Numeric(4, 2),
        default=Decimal("8.00"),
        server_default="8.00",
        nullable=False,
    )

    schedule: Mapped["WorkingSchedule"] = relationship(
        "WorkingSchedule",
        back_populates="lines",
    )

    def __repr__(self) -> str:
        return f"<WorkingScheduleDay schedule_id={self.schedule_id} day={self.day_of_week} {self.start_time}-{self.end_time}>"

