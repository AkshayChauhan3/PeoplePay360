"""
Time Off Models — PeoplePay360

Defines ORM entities for:
- TimeOffType (configurable master data e.g. PTO, Sick Leave, Unpaid Leave)
- TimeOffAllocation (assigned employee balance and validity periods)
- TimeOffRequest (leave submission, status lifecycle, approval audit)
"""

import enum
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
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
    from app.models.employee import Employee
    from app.models.user import User


def _utcnow() -> datetime:
    """Helper returning current timestamp in UTC timezone."""
    return datetime.now(timezone.utc)


class TimeOffUnit(str, enum.Enum):
    """Measurement unit for leave allocation and requests."""
    DAYS = "DAYS"
    HOURS = "HOURS"


class AllocationStatus(str, enum.Enum):
    """
    Lifecycle status of a leave allocation grant.

    States:
    - DRAFT: Draft allocation under review.
    - APPROVED: Approved allocation ready for use.
    - ACTIVE: Currently active and eligible for consumption.
    - EXPIRED: Past the valid_to boundary.
    - CANCELLED: Revoked/cancelled allocation.
    """
    DRAFT = "DRAFT"
    APPROVED = "APPROVED"
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class TimeOffRequestStatus(str, enum.Enum):
    """
    Lifecycle status of an employee leave request.

    States:
    - PENDING: Submitted and awaiting manager/HR review.
    - APPROVED: Leave approved and balance deducted.
    - REFUSED: Rejected by reviewer with mandatory refusal reason.
    - CANCELLED: Cancelled by employee or HR (restoring balance if previously approved).
    """
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REFUSED = "REFUSED"
    CANCELLED = "CANCELLED"


class TimeOffType(Base):
    """
    Configurable Leave Type (Master Data).

    Defines whether allocations are required, whether approval is required,
    and whether the leave integrates into payroll processing.
    """

    __tablename__ = "time_off_types"

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
    )

    unit: Mapped[TimeOffUnit] = mapped_column(
        Enum(TimeOffUnit, name="timeoffunit", create_type=True),
        default=TimeOffUnit.DAYS,
        server_default=TimeOffUnit.DAYS.value,
        nullable=False,
    )

    requires_allocation: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
        nullable=False,
    )

    approval_required: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
        nullable=False,
    )

    payroll_integration: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
        nullable=False,
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

    # Relationships
    allocations: Mapped[list["TimeOffAllocation"]] = relationship(
        "TimeOffAllocation",
        back_populates="time_off_type",
    )

    requests: Mapped[list["TimeOffRequest"]] = relationship(
        "TimeOffRequest",
        back_populates="time_off_type",
    )

    def __repr__(self) -> str:
        return f"<TimeOffType id={self.id} code={self.code!r} name={self.name!r} unit={self.unit}>"


class TimeOffAllocation(Base):
    """
    Employee Leave Allocation Grant.

    Represents leave entitlement allocated to an employee for a specific leave type
    over a defined validity period. Tracks consumed quantity to prevent over-allocation.
    """

    __tablename__ = "time_off_allocations"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )

    time_off_type_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("time_off_types.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )

    allocation_quantity: Mapped[Decimal] = mapped_column(
        Numeric(precision=6, scale=2),
        nullable=False,
    )

    consumed_quantity: Mapped[Decimal] = mapped_column(
        Numeric(precision=6, scale=2),
        server_default="0.00",
        default=Decimal("0.00"),
        nullable=False,
    )

    valid_from: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    valid_to: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    status: Mapped[AllocationStatus] = mapped_column(
        Enum(AllocationStatus, name="allocationstatus", create_type=True),
        default=AllocationStatus.ACTIVE,
        server_default=AllocationStatus.ACTIVE.value,
        index=True,
        nullable=False,
    )

    notes: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
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

    # Relationships
    employee: Mapped["Employee"] = relationship(
        "Employee",
        back_populates="time_off_allocations",
        lazy="selectin",
    )

    time_off_type: Mapped["TimeOffType"] = relationship(
        "TimeOffType",
        back_populates="allocations",
        lazy="selectin",
    )

    requests: Mapped[list["TimeOffRequest"]] = relationship(
        "TimeOffRequest",
        back_populates="allocation",
    )

    @property
    def remaining_quantity(self) -> float:
        """Calculate remaining usable balance."""
        return float(self.allocation_quantity - self.consumed_quantity)

    def __repr__(self) -> str:
        return (
            f"<TimeOffAllocation id={self.id} emp={self.employee_id} "
            f"type={self.time_off_type_id} allocated={self.allocation_quantity} "
            f"consumed={self.consumed_quantity} status={self.status}>"
        )


class TimeOffRequest(Base):
    """
    Employee Leave Request.

    Submitted by an employee or drafted by HR. Moves through the workflow:
    PENDING -> APPROVED / REFUSED / CANCELLED.
    """

    __tablename__ = "time_off_requests"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )

    time_off_type_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("time_off_types.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )

    allocation_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("time_off_allocations.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )

    start_date: Mapped[date] = mapped_column(
        Date,
        index=True,
        nullable=False,
    )

    end_date: Mapped[date] = mapped_column(
        Date,
        index=True,
        nullable=False,
    )

    requested_quantity: Mapped[Decimal] = mapped_column(
        Numeric(precision=6, scale=2),
        nullable=False,
    )

    reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    status: Mapped[TimeOffRequestStatus] = mapped_column(
        Enum(TimeOffRequestStatus, name="timeoffrequeststatus", create_type=True),
        default=TimeOffRequestStatus.PENDING,
        server_default=TimeOffRequestStatus.PENDING.value,
        index=True,
        nullable=False,
    )

    approved_by: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    refusal_reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
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

    # Relationships
    employee: Mapped["Employee"] = relationship(
        "Employee",
        back_populates="time_off_requests",
        lazy="selectin",
    )

    time_off_type: Mapped["TimeOffType"] = relationship(
        "TimeOffType",
        back_populates="requests",
        lazy="selectin",
    )

    allocation: Mapped["TimeOffAllocation | None"] = relationship(
        "TimeOffAllocation",
        back_populates="requests",
        lazy="selectin",
    )

    approver: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[approved_by],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<TimeOffRequest id={self.id} emp={self.employee_id} "
            f"type={self.time_off_type_id} {self.start_date}->{self.end_date} "
            f"qty={self.requested_quantity} status={self.status}>"
        )

