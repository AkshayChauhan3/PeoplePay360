import enum
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.employee import Employee


class AttendanceStatus(str, enum.Enum):
    """
    Lifecycle status of daily employee attendance.

    States:
    - PRESENT: Completed on-time workday fulfilling expected schedule.
    - LATE: Checked in after the expected shift start time.
    - ABSENT: Scheduled workday with no recorded presence.
    - INCOMPLETE: Open session with missing check-out.
    - HALF_DAY: Worked partial day (< 50% of expected schedule).
    """

    PRESENT = "PRESENT"
    LATE = "LATE"
    ABSENT = "ABSENT"
    INCOMPLETE = "INCOMPLETE"
    HALF_DAY = "HALF_DAY"


def _utcnow() -> datetime:
    """Helper returning current timestamp in UTC timezone."""
    return datetime.now(timezone.utc)


class Attendance(Base):
    """
    Daily Employee Attendance Record.

    Tracks daily check-in, check-out, and derived server-side worked time,
    late arrival minutes, and overtime relative to the employee's Working Schedule.
    """

    __tablename__ = "attendances"
    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "attendance_date",
            name="uq_attendances_employee_date",
        ),
    )

    # Primary Key
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    # Employee Foreign Key
    employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employees.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )

    # Calendar date of attendance
    attendance_date: Mapped[date] = mapped_column(
        Date,
        index=True,
        nullable=False,
    )

    # Timezone-aware check-in
    check_in: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # Timezone-aware check-out (null while session is open)
    check_out: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    # Calculated metrics (stored strictly as integer minutes)
    worked_minutes: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )

    late_minutes: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )

    overtime_minutes: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )

    # Status
    status: Mapped[AttendanceStatus] = mapped_column(
        Enum(AttendanceStatus, name="attendancestatus", create_type=True),
        default=AttendanceStatus.INCOMPLETE,
        server_default=AttendanceStatus.INCOMPLETE.value,
        index=True,
        nullable=False,
    )

    # Manual edit audit tracking
    is_manual_edit: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("false"),
        nullable=False,
    )

    correction_reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        default=None,
    )

    # Audit timestamps
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

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    employee: Mapped["Employee"] = relationship(
        "Employee",
        back_populates="attendances",
        lazy="selectin",
    )

    # ------------------------------------------------------------------
    # Derived Properties (Convenience representation)
    # ------------------------------------------------------------------
    @property
    def elapsed_hours(self) -> float | None:
        """Total elapsed hours between check-in and check-out."""
        if not self.check_out:
            return None
        elapsed_sec = (self.check_out - self.check_in).total_seconds()
        return round(max(0.0, elapsed_sec / 3600.0), 2)

    @property
    def net_hours(self) -> float:
        """Net worked hours after break deduction."""
        return round(self.worked_minutes / 60.0, 2)

    @property
    def late_hours(self) -> float:
        """Late arrival in hours."""
        return round(self.late_minutes / 60.0, 2)

    @property
    def overtime_hours(self) -> float:
        """Overtime in hours."""
        return round(self.overtime_minutes / 60.0, 2)

    def __repr__(self) -> str:
        return f"<Attendance id={self.id} emp={self.employee_id} date={self.attendance_date} status={self.status.value}>"

