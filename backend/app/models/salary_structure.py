from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.contract import Contract
    from app.models.salary_rule import SalaryRule


def _utcnow() -> datetime:
    """Helper returning current timestamp in UTC timezone."""
    return datetime.now(timezone.utc)


class SalaryStructure(Base):
    """
    Salary Structure Entity.

    Represents a structured compensation template grouping Salary Rules in a sequence
    (e.g., "Standard Full-Time Employee Structure", "Executive Remuneration Model").

    Key Architectural Rules:
    - Primary Key: Integer autoincrement (`id`).
    - Unique normalized code (e.g., 'BASE_STD', 'EXEC_STRUCT').
    - 1:N relationship with SalaryRule (ordered by sequence ascending).
    - 1:N relationship with Contract (contracts link to their applicable structure).
    """

    __tablename__ = "salary_structures"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )

    code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
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
    # Rules belonging to this structure, ordered ascending by sequence
    rules: Mapped[list["SalaryRule"]] = relationship(
        "SalaryRule",
        back_populates="salary_structure",
        order_by="SalaryRule.sequence",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # Contracts referencing this salary structure
    contracts: Mapped[list["Contract"]] = relationship(
        "Contract",
        back_populates="salary_structure",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<SalaryStructure id={self.id} code={self.code!r} name={self.name!r}>"

