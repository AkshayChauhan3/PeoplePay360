import enum
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.department import Department
    from app.models.employee import Employee
    from app.models.job_position import JobPosition
    from app.models.salary_structure import SalaryStructure


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ContractStatus(str, enum.Enum):
    """
    Operational statuses for employment contracts.
    """
    DRAFT = "DRAFT"
    RUNNING = "RUNNING"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class Contract(Base):
    """
    Employment Contract record matching PostgreSQL table schema.
    """

    __tablename__ = "contracts"
    __table_args__ = (
        CheckConstraint(
            "end_date IS NULL OR end_date >= start_date",
            name="ck_contract_date_range",
        ),
        CheckConstraint("wage >= 0", name="ck_contract_wage_positive"),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    contract_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    department_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("departments.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    job_position_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("job_positions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    salary_structure_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("salary_structures.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    end_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    wage: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    status: Mapped[ContractStatus] = mapped_column(
        Enum(ContractStatus, name="contractstatus", create_type=False),
        nullable=False,
        default=ContractStatus.DRAFT,
        server_default=text("'DRAFT'"),
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

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    employee: Mapped["Employee"] = relationship(
        "Employee",
        back_populates="contracts",
        foreign_keys=[employee_id],
        lazy="joined",
    )

    department: Mapped["Department"] = relationship(
        "Department",
        foreign_keys=[department_id],
        lazy="joined",
    )

    job_position: Mapped["JobPosition"] = relationship(
        "JobPosition",
        foreign_keys=[job_position_id],
        lazy="joined",
    )

    salary_structure: Mapped["SalaryStructure | None"] = relationship(
        "SalaryStructure",
        foreign_keys=[salary_structure_id],
    )

    # Alias for contract_number compatibility
    @property
    def reference(self) -> str:
        return self.contract_number

    def __repr__(self) -> str:
        return f"<Contract number={self.contract_number!r} status={self.status} wage={self.wage}>"
