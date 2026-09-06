"""
Email Delivery Entity — PeoplePay360

Persists delivery audit records for employee payslips distributed via email.
Tracks status (PENDING, SENDING, SENT, FAILED), transmission timestamps, retry attempts,
failure classifications (TEMPORARY vs PERMANENT), and diagnostic error messages.
"""

import enum
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
    - SENDING: Claimed by worker and currently in-flight.
    - SENT: Successfully delivered to recipient inbox or accepted by SMTP relay.
    - FAILED: Delivery attempt failed (e.g. SMTP rejection, invalid address, timeout).
    """

    PENDING = "PENDING"
    SENDING = "SENDING"
    SENT = "SENT"
    FAILED = "FAILED"


class EmailFailureType(str, enum.Enum):
    """
    Classification of failure reason for retry strategy:
    - TEMPORARY: Network glitch, socket timeout, transient 4xx.
    - PERMANENT: 5xx rejection, invalid recipient syntax, non-existent mailbox.
    """

    TEMPORARY = "TEMPORARY"
    PERMANENT = "PERMANENT"


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

    employee_id: Mapped[int] = mapped_column(
        Integer,
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

    attempt_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )

    failure_type: Mapped[EmailFailureType | None] = mapped_column(
        Enum(EmailFailureType, name="emailfailuretype", create_type=False),
        nullable=True,
        default=None,
    )

    last_attempt_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    next_retry_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    job_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        default=None,
        index=True,
    )

    storage_key: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        default=None,
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
        back_populates="email_deliveries",
        lazy="select",
    )

    employee: Mapped["Employee"] = relationship(
        "Employee",
        lazy="select",
    )
