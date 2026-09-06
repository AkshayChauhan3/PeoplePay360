from app.core.config import settings
from app.services.email.base import (
    BaseEmailProvider,
    EmailAttachment,
    EmailFailureType,
    EmailMessage,
    EmailSendResult,
)
from app.services.email.smtp_provider import SmtpEmailProvider

_email_provider_instance: BaseEmailProvider | None = None


def get_email_provider() -> BaseEmailProvider:
    """Returns singleton email provider instance configured in settings."""
    global _email_provider_instance
    if _email_provider_instance is None:
        _email_provider_instance = SmtpEmailProvider()
    return _email_provider_instance

