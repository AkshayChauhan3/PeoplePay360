import asyncio
from email.header import Header
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
import smtplib
import socket
import uuid

from app.core.config import settings
from app.services.email.base import (
    BaseEmailProvider,
    EmailFailureType,
    EmailMessage,
    EmailSendResult,
)

logger = logging.getLogger(__name__)


class SmtpEmailProvider(BaseEmailProvider):
    """
    SMTP implementation of BaseEmailProvider.
    Supports synchronous threaded SMTP execution, zero-credential mock mode,
    and granular failure classification (TEMPORARY vs PERMANENT).
    """

    def __init__(
        self,
        host: str | None = None,
        port: int | None = None,
        user: str | None = None,
        password: str | None = None,
        use_tls: bool | None = None,
        mock_mode: bool | None = None,
    ) -> None:
        self.host = host if host is not None else settings.smtp_host
        self.port = port if port is not None else settings.smtp_port
        self.user = user if user is not None else settings.smtp_user
        self.password = password if password is not None else settings.smtp_password
        self.use_tls = use_tls if use_tls is not None else settings.smtp_use_tls
        self.mock_mode = mock_mode if mock_mode is not None else settings.smtp_mock_delivery

    @property
    def is_live(self) -> bool:
        return bool(self.host.strip()) and not self.mock_mode

    def _compose_mime(self, message: EmailMessage) -> MIMEMultipart:
        msg = MIMEMultipart("mixed")
        msg["Subject"] = Header(message.subject, "utf-8")
        msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        msg["To"] = f"{message.to_name} <{message.to_email}>"

        alt_part = MIMEMultipart("alternative")
        alt_part.attach(MIMEText(message.text_body, "plain", "utf-8"))
        alt_part.attach(MIMEText(message.html_body, "html", "utf-8"))
        msg.attach(alt_part)

        for attachment in message.attachments:
            part = MIMEApplication(attachment.content, _subtype="pdf")
            part.add_header("Content-Disposition", "attachment", filename=attachment.filename)
            msg.attach(part)

        return msg

    def _send_sync(self, message: EmailMessage) -> EmailSendResult:
        to_email = message.to_email.strip()

        # 1. Permanent syntax validation
        if not to_email or "@" not in to_email or "." not in to_email.split("@")[-1]:
            return EmailSendResult(
                success=False,
                error_message=f"Invalid recipient email address format: '{to_email}'",
                failure_type=EmailFailureType.PERMANENT,
            )

        # 2. Test trigger simulation tags
        lower_email = to_email.lower()
        if "temp-fail@" in lower_email or "timeout-fail@" in lower_email:
            return EmailSendResult(
                success=False,
                error_message="Simulated temporary network/timeout failure.",
                failure_type=EmailFailureType.TEMPORARY,
            )
        if "fail@" in lower_email or "invalid-mock" in lower_email or "perm-fail@" in lower_email:
            return EmailSendResult(
                success=False,
                error_message="Simulated permanent mailbox/domain rejection.",
                failure_type=EmailFailureType.PERMANENT,
            )

        # 3. Mock Mode Simulation
        if not self.is_live:
            msg = self._compose_mime(message)
            msg_id = f"mock-{uuid.uuid4().hex[:12]}"
            logger.info(
                "Mock Email Sent -> MsgId: %s | To: %s | Subject: %s | Bytes: %d",
                msg_id,
                to_email,
                message.subject,
                len(msg.as_bytes()),
            )
            return EmailSendResult(
                success=True,
                message_id=msg_id,
            )

        # 4. Live SMTP Transmission
        try:
            msg = self._compose_mime(message)
            if self.port == 465:
                server = smtplib.SMTP_SSL(self.host, self.port, timeout=15)
            else:
                server = smtplib.SMTP(self.host, self.port, timeout=15)
                if self.use_tls:
                    server.starttls()

            if self.user and self.password:
                server.login(self.user, self.password)

            server.send_message(msg)
            server.quit()
            return EmailSendResult(
                success=True,
                message_id=f"smtp-{uuid.uuid4().hex[:12]}",
            )
        except (smtplib.SMTPRecipientsRefused, smtplib.SMTPSenderRefused) as e:
            logger.error("Permanent recipient error for %s: %s", to_email, e)
            return EmailSendResult(
                success=False,
                error_message=f"Recipient rejected: {e}",
                failure_type=EmailFailureType.PERMANENT,
            )
        except smtplib.SMTPResponseException as e:
            logger.error("SMTP response exception for %s: code=%s, msg=%s", to_email, e.smtp_code, e.smtp_error)
            # 5xx status codes indicate permanent failures; 4xx indicate temporary
            fail_type = EmailFailureType.PERMANENT if 500 <= e.smtp_code < 600 else EmailFailureType.TEMPORARY
            return EmailSendResult(
                success=False,
                error_message=f"SMTP {e.smtp_code}: {e.smtp_error}",
                failure_type=fail_type,
            )
        except (socket.timeout, TimeoutError, ConnectionRefusedError, smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected) as e:
            logger.error("Temporary network connection error for %s: %s", to_email, e)
            return EmailSendResult(
                success=False,
                error_message=f"Connection error: {e}",
                failure_type=EmailFailureType.TEMPORARY,
            )
        except Exception as e:
            logger.error("Unexpected error transmitting email to %s: %s", to_email, e)
            return EmailSendResult(
                success=False,
                error_message=f"Transmission error: {e}",
                failure_type=EmailFailureType.TEMPORARY,
            )

    async def send_email(self, message: EmailMessage) -> EmailSendResult:
        return await asyncio.to_thread(self._send_sync, message)

