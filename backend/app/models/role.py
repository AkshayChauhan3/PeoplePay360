from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


def _utcnow() -> datetime:
    """Helper returning current timestamp in UTC timezone."""
    return datetime.now(timezone.utc)


class Role(Base):
    """
    Application Role entity defining software permissions.

    Architectural distinction:
    - Role controls WHAT a User can do in the software (e.g. create employees, approve payruns).
    - JobPosition describes WHAT an Employee does in the company (e.g. Software Engineer, Accountant).

    Initial system roles:
    - EMPLOYEE: Standard user with personal self-service access (/employees/me).
    - HR_MANAGER: Full employee & master data administration.
    - HR_PAYROLL_USER: Operational HR & payroll specialist.
    - HR_PAYROLL_MANAGER: Full HR management and payroll approval authority.
    - ADMIN: Full system administrator with unrestricted access.
    """

    __tablename__ = "roles"

    # Auto-incrementing integer primary key
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    # Unique role identifier (e.g., 'ADMIN', 'HR_MANAGER'). Indexed for fast lookup.
    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )

    # Human-readable description of what permissions this role grants
    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # Allows deactivating roles without deleting historical database records
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

    # Inverse relationship: All users holding this role
    users: Mapped[list["User"]] = relationship(
        "User",
        back_populates="role",
    )

    def __repr__(self) -> str:
        return f"<Role id={self.id} name={self.name!r} is_active={self.is_active}>"
