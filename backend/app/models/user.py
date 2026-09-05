import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserRole(str, enum.Enum):
    """
    Enumeration of all supported user roles.

    Using str + Enum means role values are both type-safe Python enums
    AND valid JSON-serialisable strings, which Pydantic handles natively.
    Extend this enum when new roles are introduced; no schema migration needed
    for the Python side — only a PostgreSQL ALTER TYPE … ADD VALUE migration.
    """

    EMPLOYEE = "EMPLOYEE"
    HR_MANAGER = "HR_MANAGER"
    HR_PAYROLL_USER = "HR_PAYROLL_USER"
    HR_PAYROLL_MANAGER = "HR_PAYROLL_MANAGER"
    ADMIN = "ADMIN"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """
    Core user record.

    Stores authentication credentials and role only.
    Business information (name, department, salary, etc.) lives in the
    Employee module, linked via emp_id once that module is implemented.
    """

    __tablename__ = "users"

    # ------------------------------------------------------------------
    # Primary key — UUID avoids sequential ID enumeration
    # ------------------------------------------------------------------
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=uuid.uuid4,
    )

    # ------------------------------------------------------------------
    # Employee link — nullable until the Employee module is ready.
    # No FK constraint here; Alembic will add it in a future migration
    # when the employees table exists.
    # ------------------------------------------------------------------
    emp_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
        comment="Foreign-key-ready reference to employees.id (constraint added in a future migration)",
    )

    # ------------------------------------------------------------------
    # Authentication fields
    # ------------------------------------------------------------------
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Role — stored as a native PostgreSQL ENUM for DB-level validation
    # ------------------------------------------------------------------
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="userrole", create_type=True),
        nullable=False,
        default=UserRole.EMPLOYEE,
        server_default=UserRole.EMPLOYEE.value,
    )

    # ------------------------------------------------------------------
    # Account status
    # ------------------------------------------------------------------
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    # ------------------------------------------------------------------
    # Timestamps — always stored in UTC
    # ------------------------------------------------------------------
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
        server_default=text("now()"),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
        onupdate=_utcnow,
        server_default=text("now()"),
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role}>"

