import enum
import uuid
from datetime import date, datetime, timezone

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
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class EmployeeStatus(str, enum.Enum):
    """
    Operational status of an employee in the system.
    """

    ACTIVE = "ACTIVE"
    ON_LEAVE = "ON_LEAVE"
    TERMINATED = "TERMINATED"
    PROBATION = "PROBATION"
    SUSPENDED = "SUSPENDED"


class EmployeeType(str, enum.Enum):
    """
    Supported employee classifications for filtering and payroll grouping.
    """

    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    CONTRACT = "CONTRACT"
    INTERN = "INTERN"
    PROBATION = "PROBATION"


class Employee(Base):
    """
    Employee master record.

    Acts as the operational hub linking to department, manager,
    contracts, attendance, and leave records.
    """

    __tablename__ = "employees"
    __table_args__ = (
        UniqueConstraint("company_id", "employee_code", name="uq_employees_company_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=uuid.uuid4,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("departments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        unique=True,
        nullable=True,
        index=True,
        comment="1:1 link to login account; creating an employee does not create a user",
    )

    employee_code: Mapped[str] = mapped_column(
        String(50),
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

    work_email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    job_title: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    job_position_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("job_positions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    job_position: Mapped["JobPosition | None"] = relationship(
        "JobPosition",
        back_populates="employees",
    )

    employee_type: Mapped[EmployeeType] = mapped_column(
        Enum(EmployeeType, name="employee_type", create_type=True),
        nullable=False,
        default=EmployeeType.FULL_TIME,
        server_default=text("'FULL_TIME'"),
    )

    status: Mapped[EmployeeStatus] = mapped_column(
        Enum(EmployeeStatus, name="employee_status", create_type=True),
        nullable=False,
        default=EmployeeStatus.ACTIVE,
        server_default=text("'ACTIVE'"),
    )

    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    schedule_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("schedules.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Default work schedule assigned to the employee",
    )

    join_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    # ------------------------------------------------------------------
    # Private Banking & Financial Fields (Restricted Access)
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

    # ------------------------------------------------------------------
    # Timestamps
    # ------------------------------------------------------------------
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

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    department: Mapped["Department | None"] = relationship(
        "Department",
        foreign_keys=[department_id],
        lazy="joined",
    )

    schedule: Mapped["Schedule | None"] = relationship(
        "Schedule",
        foreign_keys=[schedule_id],
        lazy="joined",
    )

    manager: Mapped["Employee | None"] = relationship(
        "Employee",
        remote_side=[id],
        foreign_keys=[manager_id],
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def __repr__(self) -> str:
        return f"<Employee code={self.employee_code!r} name={self.full_name!r}>"
