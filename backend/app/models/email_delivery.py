"""
Email Delivery Entity — PeoplePay360

Persists delivery audit records for employee payslips distributed via email.
Tracks status (PENDING, SENT, FAILED), transmission timestamps, retry attempts,
and diagnostic error messages.
"""

import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.employee import Employee
    from app.models.payrun import Payrun
    from app.models.payslip import Payslip


class EmailDeliveryStatus(str, enum.Enum):
    """
    Lifecycle status of an individual payslip email delivery attempt.

    - PENDING: Email is queued or currently being prepared.
    - SENT: Successfully delivered to recipient inbox or accepted by SMTP relay.
    - FAILED: Delivery attempt failed (e.g. SMTP rejection, invalid address, timeout).
    """

    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"


def _utcnow() -> datetime:
    """Helper returning current timestamp in UTC timezone."""
    return datetime.now(timezone.utc)


class PayslipEmailDelivery(Base):
    """
    Payslip Email Delivery Audit Entity.

    Maintains a 1:1 delivery state per (payrun_id, payslip_id) tuple.
    When retried, the same delivery record is updated with incremented retry count
    and latest execution details.
    """

    __tablename__ = "payslip_email_deliveries"
    __table_args__ = (
        UniqueConstraint(
            "payrun_id",
            "payslip_id",
            name="uq_payslip_email_deliveries_payrun_payslip",
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

    payslip_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("payslips.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    recipient_email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    recipient_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    subject: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    status: Mapped[EmailDeliveryStatus] = mapped_column(
        Enum(EmailDeliveryStatus, name="emaildeliverystatus", create_type=False),
        default=EmailDeliveryStatus.PENDING,
        server_default=EmailDeliveryStatus.PENDING.value,
        nullable=False,
        index=True,
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        default=None,
    )

    retry_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )

    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
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
        lazy="select",
    )

    payslip: Mapped["Payslip"] = relationship(
        "Payslip",
        lazy="select",
    )

    employee: Mapped["Employee"] = relationship(
        "Employee",
        lazy="select",
    )
