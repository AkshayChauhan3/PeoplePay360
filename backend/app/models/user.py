import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# TYPE_CHECKING guards against circular import issues during runtime,
# while still providing full type hinting support for IDEs and static type checkers.
if TYPE_CHECKING:
    from app.models.employee import Employee
    from app.models.role import Role


class UserRole(str, enum.Enum):
    """
    Standard system role names for application-level type safety and RBAC constants.

    Inheriting from `str` and `enum.Enum` ensures:
    1. Enum members serialize directly to JSON strings in Pydantic.
    2. Comparison against plain strings (e.g., `user.role_name == UserRole.ADMIN`) works seamlessly.
    """

    EMPLOYEE = "EMPLOYEE"
    HR_MANAGER = "HR_MANAGER"
    HR_PAYROLL_USER = "HR_PAYROLL_USER"
    HR_PAYROLL_MANAGER = "HR_PAYROLL_MANAGER"
    ADMIN = "ADMIN"


def _utcnow() -> datetime:
    """Helper returning current timestamp in UTC timezone."""
    return datetime.now(timezone.utc)


class User(Base):
    """
    Core User entity representing login authentication credentials.

    Architectural separation:
    - User represents WHO is logging in (email, hashed password, permissions).
    - Employee represents the person in the company (name, department, salary).
    - A User may link to at most ONE Employee (1:1 relationship via `employee_id`).
    """

    __tablename__ = "users"

    # ------------------------------------------------------------------
    # Primary Key
    # ------------------------------------------------------------------
    # Auto-incrementing integer primary key.
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    # ------------------------------------------------------------------
    # 1:1 Employee Link
    # ------------------------------------------------------------------
    # Nullable because:
    # 1. System administrators might have accounts without an HR employee record.
    # 2. A user might be registered before being linked to their HR profile.
    # `unique=True` guarantees that one Employee can only ever have ONE User account.
    employee_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("employees.id"),
        unique=True,
        index=True,
        nullable=True,
        comment="1:1 unique reference to employees.id",
    )

    # ------------------------------------------------------------------
    # Authentication Fields
    # ------------------------------------------------------------------
    # Unique email used as the primary login identifier. Indexed for fast lookup.
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    # Encrypted password hash (bcrypt). Plaintext passwords are NEVER stored.
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Role Association (RBAC)
    # ------------------------------------------------------------------
    # Foreign key referencing the `roles` master table.
    # Using a relational foreign key instead of hardcoded enums allows dynamic
    # permission management without requiring schema migrations.
    role_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("roles.id"),
        index=True,
        nullable=False,
    )

    # ------------------------------------------------------------------
    # Account Status
    # ------------------------------------------------------------------
    # Inactive users cannot log in or access any protected endpoint.
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    # ------------------------------------------------------------------
    # Audit Timestamps
    # ------------------------------------------------------------------
    # UTC timestamps tracked with PostgreSQL server defaults (`now()`)
    # and Python-level callables for consistency across async sessions.
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

    # ------------------------------------------------------------------
    # SQLAlchemy Relationships
    # ------------------------------------------------------------------
    # lazy="selectin" instructs SQLAlchemy to load the associated Role in a
    # single efficient SELECT query, avoiding N+1 query performance problems.
    role: Mapped["Role"] = relationship(
        "Role",
        back_populates="users",
        lazy="selectin",
    )

    # 1:1 bidirectional link to Employee. `uselist=False` enforces scalar relation.
    employee: Mapped["Employee | None"] = relationship(
        "Employee",
        back_populates="user",
        lazy="selectin",
        uselist=False,
    )

    @property
    def role_name(self) -> str:
        """
        Convenience property to access the role's string name (e.g., 'ADMIN').
        Safely falls back to empty string if relationship is unpopulated.
        """
        return self.role.name if self.role else ""

    def __repr__(self) -> str:
        role_label = self.role.name if self.role else self.role_id
        return f"<User id={self.id} email={self.email!r} role={role_label}>"
