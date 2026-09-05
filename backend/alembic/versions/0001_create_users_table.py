"""create users table

Revision ID: 0001
Revises:
Create Date: 2026-09-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# PostgreSQL ENUM definition
userrole_enum = postgresql.ENUM(
    "EMPLOYEE",
    "HR_MANAGER",
    "HR_PAYROLL_USER",
    "HR_PAYROLL_MANAGER",
    "ADMIN",
    name="userrole",
)


def upgrade() -> None:
    # Enable the uuid-ossp / pgcrypto extension for gen_random_uuid()
    # gen_random_uuid() is built-in since PostgreSQL 13; the extension is a
    # fallback for PG 12 and below.
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # Create the ENUM type
    userrole_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("emp_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "role",
            userrole_enum,
            server_default="EMPLOYEE",
            nullable=False,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )

    # Index on email for fast login lookups
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # Index on emp_id for future FK join performance
    op.create_index("ix_users_emp_id", "users", ["emp_id"])


def downgrade() -> None:
    op.drop_index("ix_users_emp_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    userrole_enum.drop(op.get_bind(), checkfirst=True)

