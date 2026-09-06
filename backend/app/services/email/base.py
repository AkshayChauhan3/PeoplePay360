from abc import ABC, abstractmethod
from dataclasses import dataclass, field
import enum


class EmailFailureType(str, enum.Enum):
    """
    Failure classification for email transmissions.
    TEMPORARY: Connection timeout, rate limit, transient 4xx error. Eligible for automatic retry.
    PERMANENT: Invalid email syntax, unknown mailbox, 5xx rejection, blacklisted domain. Ineligible for retry.
    """
    TEMPORARY = "TEMPORARY"
    PERMANENT = "PERMANENT"


@dataclass
class EmailAttachment:
    filename: str
    content: bytes
    mime_type: str = "application/pdf"


@dataclass
class EmailMessage:
    to_email: str
    to_name: str
    subject: str
    html_body: str
    text_body: str
    attachments: list[EmailAttachment] = field(default_factory=list)


@dataclass
class EmailSendResult:
    success: bool
    message_id: str | None = None
    error_message: str | None = None
    failure_type: EmailFailureType | None = None


class BaseEmailProvider(ABC):
    """
    Abstract Base Class for email dispatch providers (SMTP, SES, Mock, etc.).
    """

    @abstractmethod
    async def send_email(self, message: EmailMessage) -> EmailSendResult:
        """
        Transmits an email message asynchronously.
        Returns EmailSendResult with success flag and failure classification.
        """
        pass

