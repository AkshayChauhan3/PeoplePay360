"""
Email Delivery Schemas — PeoplePay360

Defines Pydantic models for payslip email distribution requests,
individual delivery audit records, and batch readiness summaries.
"""

from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.email_delivery import EmailDeliveryStatus


class PayslipEmailDeliveryItem(BaseModel):
    """Itemized delivery record for an individual employee payslip."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    payrun_id: int
    payslip_id: int
    employee_id: uuid.UUID
    employee_code: str = Field(description="Unique organizational code of the employee")
    employee_name: str = Field(description="Full name of the employee")
    recipient_email: str
    recipient_name: str
    subject: str
    status: EmailDeliveryStatus
    error_message: str | None = None
    retry_count: int = 0
    sent_at: datetime | None = None
    created_at: datetime


class EmailDeliverySummaryResponse(BaseModel):
    """Aggregate delivery metrics and audit log for a payrun batch."""

    model_config = ConfigDict(from_attributes=True)

    payrun_id: int
    payrun_name: str
    total_payslips: int = Field(description="Total number of payslips in this payrun")
    sent_count: int = Field(description="Number of payslips successfully delivered")
    failed_count: int = Field(description="Number of payslips that failed delivery")
    pending_count: int = Field(description="Number of payslips currently pending transmission")
    not_attempted_count: int = Field(description="Number of payslips not yet attempted")
    can_retry: bool = Field(description="True if there are failed deliveries that can be retried")
    deliveries: list[PayslipEmailDeliveryItem] = Field(
        default_factory=list,
        description="Detailed delivery records for each payslip",
    )


class SendPayslipsRequest(BaseModel):
    """Payload for triggering payslip email delivery batch."""

    force_resend_all: bool = Field(
        default=False,
        description="If True, re-sends emails even to employees who already have status SENT",
    )


class SendPayslipsResponse(BaseModel):
    """Summary response returned after triggering payslip email delivery."""

    payrun_id: int
    total_payslips: int
    processed_count: int
    sent_count: int
    failed_count: int
    skipped_count: int
    message: str


class SinglePayslipEmailResponse(BaseModel):
    """Response returned after sending an individual payslip email."""

    payslip_id: int
    employee_id: uuid.UUID
    recipient_email: str
    status: EmailDeliveryStatus
    error_message: str | None = None
    sent_at: datetime | None = None
    message: str
