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


class JobPosition(Base):
    """
    JobPosition master entity representing an employee's organizational job title.

    Examples: 'Senior Software Engineer', 'Product Manager', 'HR Generalist'.

    Crucial Architectural Principle:
    - JobPosition != System Role.
    - An employee with JobPosition = 'HR Director' will typically hold System Role = 'HR_MANAGER'.
    - An employee with JobPosition = 'Senior Software Engineer' will typically hold System Role = 'EMPLOYEE'.
    """

    __tablename__ = "job_positions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    # Job title name (e.g. "Senior Software Engineer"). Unique and indexed.
    name: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        index=True,
        nullable=False,
    )

    # Short position code (e.g. "SR_SWE"). Unique and normalized uppercase.
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

    # Soft deactivation flag. Prevents physical deletion from breaking employee records.
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

    # Bidirectional relationship: all employees holding this job position
    employees: Mapped[list["Employee"]] = relationship(
        "Employee",
        back_populates="job_position",
    )

    def __repr__(self) -> str:
        return f"<JobPosition id={self.id} code={self.code!r} name={self.name!r}>"
