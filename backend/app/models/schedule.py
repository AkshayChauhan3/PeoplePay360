from datetime import datetime, time, timezone
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
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
    return datetime.now(timezone.utc)


class Schedule(Base):
    """
    Working Schedule container.

    Represents an operational work schedule (e.g. 40h/week, 5 days/week).
    Total weekly hours are derived from child ScheduleLines.
    """

    __tablename__ = "working_schedules"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
    )

    calendar_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="STANDARD",
        server_default=text("'STANDARD'"),
    )

    hours_per_week: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("40.00"),
        server_default=text("40.00"),
    )

    days_per_week: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=5,
        server_default=text("5"),
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
        server_default=text("now()"),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
        onupdate=_utcnow,
        server_default=text("now()"),
    )

    lines: Mapped[list["ScheduleLine"]] = relationship(
        "ScheduleLine",
        back_populates="schedule",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ScheduleLine.day_of_week",
    )

    def __repr__(self) -> str:
        return f"<Schedule id={self.id} name={self.name!r} hours_per_week={self.hours_per_week}>"


class ScheduleLine(Base):
    """
    Day-by-day line item for a Working Schedule.

    day_of_week: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday,
                 4=Friday, 5=Saturday, 6=Sunday.
    """

    __tablename__ = "working_schedule_days"
    __table_args__ = (
        UniqueConstraint("schedule_id", "day_of_week", name="uq_working_schedule_days_schedule_day"),
        CheckConstraint("day_of_week BETWEEN 0 AND 6", name="ck_schedule_lines_day_of_week"),
        CheckConstraint("work_hours >= 0", name="ck_schedule_hours_positive"),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    schedule_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("working_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

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
        nullable=False,
        default=60,
        server_default=text("60"),
    )

    work_hours: Mapped[Decimal] = mapped_column(
        Numeric(4, 2),
        nullable=False,
        default=Decimal("8.00"),
        server_default=text("8.00"),
    )

    schedule: Mapped["Schedule"] = relationship(
        "Schedule",
        back_populates="lines",
    )

    def __repr__(self) -> str:
        return (
            f"<ScheduleLine id={self.id} day={self.day_of_week} "
            f"{self.start_time}-{self.end_time} work_hours={self.work_hours}>"
        )


# Backward compatibility aliases
WorkingSchedule = Schedule
WorkingScheduleDay = ScheduleLine
