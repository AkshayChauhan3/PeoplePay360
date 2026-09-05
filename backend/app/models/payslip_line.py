from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.salary_rule import SalaryRuleCategory

if TYPE_CHECKING:
    from app.models.payslip import Payslip
    from app.models.salary_rule import SalaryRule


def _utcnow() -> datetime:
    """Helper returning current timestamp in UTC timezone."""
    return datetime.now(timezone.utc)


class PayslipLine(Base):
    """
    PayslipLine Entity.

    Represents a single evaluated rule line item within a calculated payslip
    (e.g., BASIC: 50,000.00, HRA: 10,000.00, PF: 6,000.00, NET: 54,000.00).

    Historical Immutability:
    Stores code, name, category, sequence, and amount at the time of payroll computation.
    Changes to master SalaryRule definitions will NOT alter existing PayslipLine records.
    """

    __tablename__ = "payslip_lines"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    payslip_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("payslips.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    salary_rule_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("salary_rules.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    category: Mapped[SalaryRuleCategory] = mapped_column(
        Enum(SalaryRuleCategory, name="salaryrulecategory", create_type=False),
        nullable=False,
    )

    sequence: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=10,
    )

    amount: Mapped[Decimal] = mapped_column(
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

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    payslip: Mapped["Payslip"] = relationship(
        "Payslip",
        back_populates="lines",
        lazy="selectin",
    )

    salary_rule: Mapped["SalaryRule | None"] = relationship(
        "SalaryRule",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<PayslipLine id={self.id} payslip_id={self.payslip_id} "
            f"code={self.code!r} category={self.category.value} amount={self.amount}>"
        )

