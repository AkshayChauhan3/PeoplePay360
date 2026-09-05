import enum
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


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
    Employment Contract record.

    Defines the compensation terms, working schedule, and salary structure
    applicable to an employee for a designated time window.
    """

    __tablename__ = "contracts"
    __table_args__ = (
        CheckConstraint(
            "end_date IS NULL OR end_date >= start_date",
            name="ck_contract_date_range",
        ),
        CheckConstraint("wage >= 0", name="ck_contract_wage_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=uuid.uuid4,
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    schedule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("schedules.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    salary_structure_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
        comment="Foreign-key-ready reference to salary_structures.id",
    )

    reference: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
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
        Enum(ContractStatus, name="contract_status", create_type=True),
        nullable=False,
        default=ContractStatus.DRAFT,
        server_default=text("'DRAFT'"),
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
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

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    employee: Mapped["Employee"] = relationship(  # noqa: F821
        "Employee",
        foreign_keys=[employee_id],
        lazy="joined",
    )

    schedule: Mapped["Schedule"] = relationship(  # noqa: F821
        "Schedule",
        foreign_keys=[schedule_id],
        lazy="joined",
    )

    def __repr__(self) -> str:
        return f"<Contract ref={self.reference!r} status={self.status} wage={self.wage}>"
