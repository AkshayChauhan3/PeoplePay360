from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.employee import Employee


def _utcnow() -> datetime:
    """Helper returning current timestamp in UTC timezone."""
    return datetime.now(timezone.utc)


class Department(Base):
    """
    Department master entity representing an organizational unit.

    Examples: 'Engineering', 'Human Resources', 'Finance & Accounts', 'Sales'.

    Key constraints:
    - `name` is unique across the company.
    - `code` is unique and normalized to uppercase (e.g. 'ENG', 'FIN').
    - `is_active` supports soft deactivation, ensuring historical payslips,
      attendance, and contracts retain their organizational reference.
    """

    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    # Department name (e.g. "Engineering"). Unique and indexed.
    name: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        index=True,
        nullable=False,
    )

    # Short organizational code (e.g. "ENG"). Unique and normalized.
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

    # Soft deactivation flag. Prevents cascading deletes from breaking history.
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

    # Bidirectional relationship: all employees assigned to this department
    employees: Mapped[list["Employee"]] = relationship(
        "Employee",
        back_populates="department",
    )

    def __repr__(self) -> str:
        return f"<Department id={self.id} code={self.code!r} name={self.name!r}>"
