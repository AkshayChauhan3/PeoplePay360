import enum
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.contract import Contract
    from app.models.employee import Employee
    from app.models.payrun import Payrun
    from app.models.payslip_line import PayslipLine
    from app.models.salary_structure import SalaryStructure


class PayslipStatus(str, enum.Enum):
    """
    Lifecycle status of an individual employee payslip.

    States:
    - DRAFT: Initialized from payrun wizard; lines not yet calculated.
    - COMPUTED: Engine ran; inputs and rules resolved, lines populated.
    - VALIDATED: Verified by payroll manager as accurate; locked from silent modification.
    - PAID: Paid out to employee; historically frozen snapshot.
    - CANCELLED: Voided or excluded payslip.
    """

    DRAFT = "DRAFT"
    COMPUTED = "COMPUTED"
    VALIDATED = "VALIDATED"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


def _utcnow() -> datetime:
    """Helper returning current timestamp in UTC timezone."""
    return datetime.now(timezone.utc)


class Payslip(Base):
    """
    Payslip Entity.

    Represents an individual employee's salary statement for a specific payrun period.
    Persists aggregated totals (gross, deductions, net, worked days) and links to
    itemized PayslipLine records.
    """

    __tablename__ = "payslips"
    __table_args__ = (
        UniqueConstraint(
            "employee_id",
            "period_start",
            "period_end",
            name="uq_payslips_employee_period",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    payrun_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("payruns.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employees.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )

    contract_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("contracts.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )

    salary_structure_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("salary_structures.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )

    period_start: Mapped[date] = mapped_column(
        Date,
        index=True,
        nullable=False,
    )

    period_end: Mapped[date] = mapped_column(
        Date,
        index=True,
        nullable=False,
    )

    status: Mapped[PayslipStatus] = mapped_column(
        Enum(PayslipStatus, name="payslipstatus", create_type=True),
        default=PayslipStatus.DRAFT,
        server_default=PayslipStatus.DRAFT.value,
        nullable=False,
        index=True,
    )

    worked_days: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        default=Decimal("0.00"),
        server_default="0.00",
        nullable=False,
    )

    gross_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0.00"),
        server_default="0.00",
        nullable=False,
    )

    deduction_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0.00"),
        server_default="0.00",
        nullable=False,
    )

    net_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0.00"),
        server_default="0.00",
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

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    payrun: Mapped["Payrun"] = relationship(
        "Payrun",
        back_populates="payslips",
        lazy="selectin",
    )

    employee: Mapped["Employee"] = relationship(
        "Employee",
        lazy="selectin",
    )

    contract: Mapped["Contract"] = relationship(
        "Contract",
        lazy="selectin",
    )

    salary_structure: Mapped["SalaryStructure"] = relationship(
        "SalaryStructure",
        lazy="selectin",
    )

    lines: Mapped[list["PayslipLine"]] = relationship(
        "PayslipLine",
        back_populates="payslip",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="PayslipLine.sequence",
    )

    def __repr__(self) -> str:
        return (
            f"<Payslip id={self.id} payrun_id={self.payrun_id} "
            f"employee_id={self.employee_id} status={self.status.value} "
            f"net={self.net_amount}>"
        )

