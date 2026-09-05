import enum
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.department import Department
    from app.models.employee import Employee
    from app.models.job_position import JobPosition


class ContractStatus(str, enum.Enum):
    """
    Lifecycle status of an employment contract.

    States:
    - DRAFT: Contract prepared or pending review/signature; not yet active for payroll.
    - RUNNING: Currently in-force contract used for attendance, payroll calculation, and payslips.
    - EXPIRED: Contract has naturally passed its end date.
    - CANCELLED: Early termination, voided, or replaced contract.
    """

    DRAFT = "DRAFT"
    RUNNING = "RUNNING"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


def _utcnow() -> datetime:
    """Helper returning current timestamp in UTC timezone."""
    return datetime.now(timezone.utc)


class Contract(Base):
    """
    Employment Contract Entity.

    Represents a formal legal and financial contract between an Employee and the organization.
    Defines compensation (wage), assigned department, job position, effective duration,
    and lifecycle status.

    Key Architectural Rules:
    - Primary Key: Integer autoincrement (`id`).
    - Monetary precision: `wage` stored as `Numeric(12, 2)` (never float).
    - Open-ended / permanent contracts have `end_date = None`.
    - An employee cannot have multiple overlapping `RUNNING` contracts.
    - `salary_structure_id` is nullable integer reserved for future salary structure modules.
    """

    __tablename__ = "contracts"

    # ------------------------------------------------------------------
    # Primary Key & Identifiers
    # ------------------------------------------------------------------
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    # Unique reference number (e.g. "CNT-2026-0001"). Indexed for fast lookups.
    contract_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Foreign Keys & Organizational Assignment
    # ------------------------------------------------------------------
    # The employee who is party to this contract.
    employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employees.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )

    # Organizational department associated with this contract.
    department_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("departments.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )

    # Organizational job position associated with this contract.
    job_position_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("job_positions.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )

    # Reserved for future salary structure engine (e.g., allowances, deductions formula).
    # Nullable, without a foreign key constraint until the Salary Structure module is built.
    salary_structure_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        default=None,
    )

    # ------------------------------------------------------------------
    # Contract Period & Terms
    # ------------------------------------------------------------------
    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    # Nullable for permanent / open-ended employment contracts.
    end_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    # Financial compensation: monthly base wage or agreed remuneration.
    # Stored with 2 decimal places to ensure exact currency math.
    wage: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Status & Audit Timestamps
    # ------------------------------------------------------------------
    status: Mapped[ContractStatus] = mapped_column(
        Enum(ContractStatus, name="contractstatus", create_type=True),
        default=ContractStatus.DRAFT,
        server_default=ContractStatus.DRAFT.value,
        nullable=False,
        index=True,
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

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    # Associated employee
    employee: Mapped["Employee"] = relationship(
        "Employee",
        back_populates="contracts",
        lazy="selectin",
    )

    # Associated department
    department: Mapped["Department"] = relationship(
        "Department",
        lazy="selectin",
    )

    # Associated job position
    job_position: Mapped["JobPosition"] = relationship(
        "JobPosition",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Contract id={self.id} number={self.contract_number!r} employee_id={self.employee_id} status={self.status.value}>"
