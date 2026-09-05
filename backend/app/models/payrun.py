import enum
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.payslip import Payslip
    from app.models.salary_structure import SalaryStructure
    from app.models.user import User


class PayrunStatus(str, enum.Enum):
    """
    Lifecycle status of a payroll run.

    States:
    - DRAFT: Payrun created with selected employees; payslips drafted, not yet computed.
    - COMPUTED: Calculation engine has executed across all payslips; figures are ready for review.
    - VALIDATED: Audit checks passed with no blocking errors; ready for settlement.
    - PAID: Financial settlement finalized; records are historically frozen.
    - CANCELLED: Voided batch.
    """

    DRAFT = "DRAFT"
    COMPUTED = "COMPUTED"
    VALIDATED = "VALIDATED"
    PAID = "PAID"
    CANCELLED = "CANCELLED"


def _utcnow() -> datetime:
    """Helper returning current timestamp in UTC timezone."""
    return datetime.now(timezone.utc)


class Payrun(Base):
    """
    Payrun Entity.

    Represents an organizational payroll batch for a defined calendar period
    (e.g., Monthly Payroll for 2026-09-01 to 2026-09-30).

    Key Architectural Rules:
    - Governs a collection of Payslips for selected employees.
    - Associated with a primary SalaryStructure template.
    - Transitions strictly through DRAFT -> COMPUTED -> VALIDATED -> PAID.
    - PAID payruns cannot be deleted or recomputed.
    """

    __tablename__ = "payruns"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
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

    status: Mapped[PayrunStatus] = mapped_column(
        Enum(PayrunStatus, name="payrunstatus", create_type=True),
        default=PayrunStatus.DRAFT,
        server_default=PayrunStatus.DRAFT.value,
        nullable=False,
        index=True,
    )

    created_by: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        default=None,
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
    salary_structure: Mapped["SalaryStructure"] = relationship(
        "SalaryStructure",
        lazy="selectin",
    )

    creator: Mapped["User | None"] = relationship(
        "User",
        lazy="selectin",
    )

    payslips: Mapped[list["Payslip"]] = relationship(
        "Payslip",
        back_populates="payrun",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Payrun id={self.id} name={self.name!r} status={self.status.value}>"

