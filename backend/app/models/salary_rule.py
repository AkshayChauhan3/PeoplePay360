import enum
from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.salary_structure import SalaryStructure


class SalaryRuleCategory(str, enum.Enum):
    """
    Categorization of a salary rule.

    Allowed categories:
    - BASIC: Base salary or fixed contract compensation.
    - ALLOWANCE: Additions (e.g. HRA, Transport, Meal, Medical allowance).
    - GROSS: Intermediate total before deductions (e.g. BASIC + ALLOWANCES).
    - DEDUCTION: Subtractions (e.g. PF, Tax, Social Security, unpaid leave deduction).
    - NET: Final payable remuneration (e.g. GROSS - DEDUCTIONS).
    """

    BASIC = "BASIC"
    ALLOWANCE = "ALLOWANCE"
    GROSS = "GROSS"
    DEDUCTION = "DEDUCTION"
    NET = "NET"


class ComputationType(str, enum.Enum):
    """
    Method used to compute the value of a salary rule.

    - FIXED: A constant monetary amount (e.g., 3000.00).
    - PERCENTAGE: A percentage applied to another earlier rule's calculated amount (e.g., 20% of BASIC).
    - FORMULA: A safe mathematical expression evaluated using earlier rule codes and context variables.
    """

    FIXED = "FIXED"
    PERCENTAGE = "PERCENTAGE"
    FORMULA = "FORMULA"


def _utcnow() -> datetime:
    """Helper returning current timestamp in UTC timezone."""
    return datetime.now(timezone.utc)


class SalaryRule(Base):
    """
    Salary Rule Entity.

    Represents a specific line item in a salary structure that computes an amount
    (earnings, allowances, gross totals, deductions, net pay).

    Key Architectural Rules:
    - Monetary precision: Numeric(12, 2) for monetary values. Never use float.
    - Percentage precision: Numeric(5, 2) (e.g., 20.00%).
    - Scoped uniqueness: `(salary_structure_id, code)` and `(salary_structure_id, sequence)`
      must be unique within each structure.
    - Evaluated in ascending `sequence` order.
    """

    __tablename__ = "salary_rules"
    __table_args__ = (
        UniqueConstraint(
            "salary_structure_id",
            "code",
            name="uq_salary_rules_structure_code",
        ),
        UniqueConstraint(
            "salary_structure_id",
            "sequence",
            name="uq_salary_rules_structure_sequence",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    salary_structure_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("salary_structures.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    code: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,
    )

    category: Mapped[SalaryRuleCategory] = mapped_column(
        Enum(SalaryRuleCategory, name="salaryrulecategory", create_type=True),
        nullable=False,
        index=True,
    )

    sequence: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        index=True,
    )

    computation_type: Mapped[ComputationType] = mapped_column(
        Enum(ComputationType, name="computationtype", create_type=True),
        nullable=False,
    )

    # Required when computation_type == FIXED
    fixed_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True,
        default=None,
    )

    # Required when computation_type == PERCENTAGE (0.00 to 100.00)
    percentage: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2),
        nullable=True,
        default=None,
    )

    # Required when computation_type == PERCENTAGE (references earlier rule code in structure)
    percentage_base: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        default=None,
    )

    # Required when computation_type == FORMULA (e.g. 'BASIC + HRA + TRANSPORT')
    formula: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        default=None,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
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
    salary_structure: Mapped["SalaryStructure"] = relationship(
        "SalaryStructure",
        back_populates="rules",
    )

    def __repr__(self) -> str:
        return f"<SalaryRule id={self.id} code={self.code!r} seq={self.sequence} type={self.computation_type.value}>"

