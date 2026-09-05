import enum
import uuid
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.attendance import Attendance
    from app.models.contract import Contract
    from app.models.department import Department
    from app.models.job_position import JobPosition
    from app.models.schedule import Schedule
    from app.models.time_off import TimeOffAllocation, TimeOffRequest
    from app.models.user import User


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class EmployeeStatus(str, enum.Enum):
    """
    Operational status of an employee in the system.
    """
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ON_LEAVE = "ON_LEAVE"
    TERMINATED = "TERMINATED"


class Employee(Base):
    """
    Employee master record matching PostgreSQL table schema.
    """

    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=uuid.uuid4,
    )

    employee_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
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

    department_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("departments.id", name="fk_employees_department_id"),
        nullable=False,
        index=True,
    )

    job_position_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("job_positions.id", name="fk_employees_job_position_id"),
        nullable=False,
        index=True,
    )

    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", name="fk_employees_manager_id"),
        nullable=True,
        index=True,
    )

    status: Mapped[EmployeeStatus] = mapped_column(
        Enum(EmployeeStatus, name="employeestatus", create_type=False),
        nullable=False,
        default=EmployeeStatus.ACTIVE,
        server_default=text("'ACTIVE'"),
    )

    working_schedule_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("working_schedules.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ------------------------------------------------------------------
    # Banking & Financial Details (Phase 8: Corporate Payout)
    # ------------------------------------------------------------------
    bank_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    bank_account_number: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    ifsc_code: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    pan_number: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    account_holder_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
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

    # Relationships
    department: Mapped["Department"] = relationship(
        "Department",
        foreign_keys=[department_id],
        back_populates="employees",
    )

    job_position: Mapped["JobPosition"] = relationship(
        "JobPosition",
        foreign_keys=[job_position_id],
        back_populates="employees",
    )

    manager: Mapped["Employee | None"] = relationship(
        "Employee",
        remote_side=[id],
        foreign_keys=[manager_id],
    )

    schedule: Mapped["Schedule | None"] = relationship(
        "Schedule",
        foreign_keys=[working_schedule_id],
        lazy="joined",
    )

    user: Mapped["User | None"] = relationship(
        "User",
        back_populates="employee",
        uselist=False,
    )

    contracts: Mapped[list["Contract"]] = relationship(
        "Contract",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    attendances: Mapped[list["Attendance"]] = relationship(
        "Attendance",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    time_off_allocations: Mapped[list["TimeOffAllocation"]] = relationship(
        "TimeOffAllocation",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    time_off_requests: Mapped[list["TimeOffRequest"]] = relationship(
        "TimeOffRequest",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def is_active(self) -> bool:
        return self.status != EmployeeStatus.TERMINATED

    def __repr__(self) -> str:
        return f"<Employee id={self.id} code={self.employee_code!r} name={self.full_name!r}>"
