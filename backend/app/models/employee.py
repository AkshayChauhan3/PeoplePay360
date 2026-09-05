import enum
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# Prevent circular imports while keeping static type checking intact
if TYPE_CHECKING:
    from app.models.attendance import Attendance
    from app.models.contract import Contract
    from app.models.department import Department
    from app.models.job_position import JobPosition
    from app.models.schedule import WorkingSchedule
    from app.models.user import User


class EmployeeStatus(str, enum.Enum):
    """
    
    Lifecycle status of an employee.

    States:
    - ACTIVE: Currently working, eligible for payroll, shifts, and attendance.
    - INACTIVE: Temporarily paused (e.g., sabbatical or suspended).
    - ON_LEAVE: Currently on approved extended leave.
    - TERMINATED: Former employee. Record retained for historical payroll/tax compliance.
    """

    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ON_LEAVE = "ON_LEAVE"
    TERMINATED = "TERMINATED"


def _utcnow() -> datetime:
    """Helper returning current timestamp in UTC timezone."""
    return datetime.now(timezone.utc)


class Employee(Base):
    """
    Central HR Business Entity representing an actual person working in the company.

    This model serves as the root hub for all future HR/payroll modules:
    - Contracts (future Phase 3)
    - Attendance & Shifts (future Phase 4)
    - Salary Structures & Payslips (future Phase 5)
    """

    __tablename__ = "employees"

    # ------------------------------------------------------------------
    # Primary Key & Identifiers
    # ------------------------------------------------------------------
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    # Unique organizational code (e.g. "EMP001", "EMP002"). Indexed for quick search.
    employee_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Personal & Contact Information
    # ------------------------------------------------------------------
    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # Work email address; unique across the employee database.
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    phone: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    date_of_birth: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    joining_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Organizational Foreign Keys
    # ------------------------------------------------------------------
    # Department the employee belongs to.
    department_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("departments.id"),
        index=True,
        nullable=False,
    )

    # Job title / organizational position held by the employee.
    job_position_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("job_positions.id"),
        index=True,
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Self-Referencing Manager Hierarchy
    # ------------------------------------------------------------------
    # A manager is simply another employee.
    # Nullable because top-level executives (e.g. CEO) have no manager.
    manager_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("employees.id"),
        index=True,
        nullable=True,
    )

    # Working schedule assigned to this employee (nullable, defaults to system default schedule if null).
    working_schedule_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("working_schedules.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
        default=None,
    )

    # ------------------------------------------------------------------
    # Lifecycle Status
    # ------------------------------------------------------------------
    status: Mapped[EmployeeStatus] = mapped_column(
        Enum(EmployeeStatus, name="employeestatus", create_type=True),
        default=EmployeeStatus.ACTIVE,
        server_default=EmployeeStatus.ACTIVE.value,
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Audit Timestamps
    # ------------------------------------------------------------------
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
    # Eagerly loads Department metadata (name, code) with selectin
    department: Mapped["Department"] = relationship(
        "Department",
        back_populates="employees",
        lazy="selectin",
    )

    # Eagerly loads JobPosition metadata with selectin
    job_position: Mapped["JobPosition"] = relationship(
        "JobPosition",
        back_populates="employees",
        lazy="selectin",
    )

    # Self-referential relationship pointing upwards to the manager.
    # `remote_side="Employee.id"` tells SQLAlchemy that the 'parent' side
    # of the relationship is identified by the target table's primary key.
    manager: Mapped["Employee | None"] = relationship(
        "Employee",
        remote_side="Employee.id",
        foreign_keys=[manager_id],
        back_populates="subordinates",
        lazy="selectin",
    )

    # Self-referential collection of direct reports (subordinates).
    subordinates: Mapped[list["Employee"]] = relationship(
        "Employee",
        foreign_keys=[manager_id],
        back_populates="manager",
    )

    # 1:1 bidirectional link to User authentication account (if linked).
    user: Mapped["User | None"] = relationship(
        "User",
        back_populates="employee",
        uselist=False,
    )

    # 1:N relationship: all employment contracts for this employee
    contracts: Mapped[list["Contract"]] = relationship(
        "Contract",
        back_populates="employee",
    )

    # Assigned working schedule
    working_schedule: Mapped["WorkingSchedule | None"] = relationship(
        "WorkingSchedule",
        lazy="selectin",
    )

    # 1:N relationship: employee attendance records
    attendances: Mapped[list["Attendance"]] = relationship(
        "Attendance",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    @property
    def full_name(self) -> str:
        """Convenience property concatenating first and last name."""
        return f"{self.first_name} {self.last_name}"

    def __repr__(self) -> str:
        return f"<Employee id={self.id} code={self.employee_code!r} name={self.full_name!r}>"
