"""create time off tables

Revision ID: 0005
Revises: 0004
Create Date: 2026-09-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers
revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

timeoffunit_enum = postgresql.ENUM(
    "DAYS",
    "HOURS",
    name="timeoffunit",
    create_type=False,
)

allocationstatus_enum = postgresql.ENUM(
    "DRAFT",
    "APPROVED",
    "ACTIVE",
    "EXPIRED",
    "CANCELLED",
    name="allocationstatus",
    create_type=False,
)

timeoffrequeststatus_enum = postgresql.ENUM(
    "PENDING",
    "APPROVED",
    "REFUSED",
    "CANCELLED",
    name="timeoffrequeststatus",
    create_type=False,
)


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Create PostgreSQL ENUM types idempotently
    # ------------------------------------------------------------------
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE timeoffunit AS ENUM ('DAYS', 'HOURS');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE allocationstatus AS ENUM ('DRAFT', 'APPROVED', 'ACTIVE', 'EXPIRED', 'CANCELLED');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE timeoffrequeststatus AS ENUM ('PENDING', 'APPROVED', 'REFUSED', 'CANCELLED');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # ------------------------------------------------------------------
    # 2. Create time_off_types table
    # ------------------------------------------------------------------
    op.create_table(
        "time_off_types",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("unit", timeoffunit_enum, server_default="DAYS", nullable=False),
        sa.Column("requires_allocation", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("approval_required", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("payroll_integration", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_time_off_types_name"),
        sa.UniqueConstraint("code", name="uq_time_off_types_code"),
    )
    op.create_index("ix_time_off_types_name", "time_off_types", ["name"])
    op.create_index("ix_time_off_types_code", "time_off_types", ["code"])

    # ------------------------------------------------------------------
    # 3. Create time_off_allocations table
    # ------------------------------------------------------------------
    op.create_table(
        "time_off_allocations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("time_off_type_id", sa.Integer(), nullable=False),
        sa.Column("allocation_quantity", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("consumed_quantity", sa.Numeric(precision=6, scale=2), server_default="0.00", nullable=False),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_to", sa.Date(), nullable=False),
        sa.Column("status", allocationstatus_enum, server_default="ACTIVE", nullable=False),
        sa.Column("notes", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["employee_id"],
            ["employees.id"],
            name="fk_time_off_allocations_employee_id_employees",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["time_off_type_id"],
            ["time_off_types.id"],
            name="fk_time_off_allocations_time_off_type_id_time_off_types",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_time_off_allocations_employee_id", "time_off_allocations", ["employee_id"])
    op.create_index("ix_time_off_allocations_time_off_type_id", "time_off_allocations", ["time_off_type_id"])
    op.create_index("ix_time_off_allocations_status", "time_off_allocations", ["status"])

    # ------------------------------------------------------------------
    # 4. Create time_off_requests table
    # ------------------------------------------------------------------
    op.create_table(
        "time_off_requests",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("time_off_type_id", sa.Integer(), nullable=False),
        sa.Column("allocation_id", sa.Integer(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("requested_quantity", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.Column("status", timeoffrequeststatus_enum, server_default="PENDING", nullable=False),
        sa.Column("approved_by", sa.Integer(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("refusal_reason", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["employee_id"],
            ["employees.id"],
            name="fk_time_off_requests_employee_id_employees",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["time_off_type_id"],
            ["time_off_types.id"],
            name="fk_time_off_requests_time_off_type_id_time_off_types",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["allocation_id"],
            ["time_off_allocations.id"],
            name="fk_time_off_requests_allocation_id_time_off_allocations",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["approved_by"],
            ["users.id"],
            name="fk_time_off_requests_approved_by_users",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_time_off_requests_employee_id", "time_off_requests", ["employee_id"])
    op.create_index("ix_time_off_requests_time_off_type_id", "time_off_requests", ["time_off_type_id"])
    op.create_index("ix_time_off_requests_allocation_id", "time_off_requests", ["allocation_id"])
    op.create_index("ix_time_off_requests_start_date", "time_off_requests", ["start_date"])
    op.create_index("ix_time_off_requests_end_date", "time_off_requests", ["end_date"])
    op.create_index("ix_time_off_requests_status", "time_off_requests", ["status"])

    # ------------------------------------------------------------------
    # 5. Seed Default Standard Leave Types
    # ------------------------------------------------------------------
    op.execute("""
        INSERT INTO time_off_types (name, code, description, unit, requires_allocation, approval_required, payroll_integration, is_active)
        VALUES 
            ('Paid Time Off', 'PTO', 'Standard annual paid vacation entitlement', 'DAYS', true, true, true, true),
            ('Sick Leave', 'SICK', 'Paid sick leave allowance', 'DAYS', true, true, true, true),
            ('Unpaid Leave', 'UNPAID', 'Approved leave without pay; no allocation required', 'DAYS', false, true, true, true)
        ON CONFLICT (code) DO NOTHING;
    """)


def downgrade() -> None:
    op.drop_index("ix_time_off_requests_status", table_name="time_off_requests")
    op.drop_index("ix_time_off_requests_end_date", table_name="time_off_requests")
    op.drop_index("ix_time_off_requests_start_date", table_name="time_off_requests")
    op.drop_index("ix_time_off_requests_allocation_id", table_name="time_off_requests")
    op.drop_index("ix_time_off_requests_time_off_type_id", table_name="time_off_requests")
    op.drop_index("ix_time_off_requests_employee_id", table_name="time_off_requests")
    op.drop_table("time_off_requests")

    op.drop_index("ix_time_off_allocations_status", table_name="time_off_allocations")
    op.drop_index("ix_time_off_allocations_time_off_type_id", table_name="time_off_allocations")
    op.drop_index("ix_time_off_allocations_employee_id", table_name="time_off_allocations")
    op.drop_table("time_off_allocations")

    op.drop_index("ix_time_off_types_code", table_name="time_off_types")
    op.drop_index("ix_time_off_types_name", table_name="time_off_types")
    op.drop_table("time_off_types")

    timeoffrequeststatus_enum.drop(op.get_bind(), checkfirst=True)
    allocationstatus_enum.drop(op.get_bind(), checkfirst=True)
    timeoffunit_enum.drop(op.get_bind(), checkfirst=True)

