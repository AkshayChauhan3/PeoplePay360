"""create contracts table

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers
revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

contractstatus_enum = postgresql.ENUM(
    "DRAFT",
    "RUNNING",
    "EXPIRED",
    "CANCELLED",
    name="contractstatus",
    create_type=False,
)


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Create contractstatus ENUM type idempotently
    # ------------------------------------------------------------------
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE contractstatus AS ENUM (
                'DRAFT', 'RUNNING', 'EXPIRED', 'CANCELLED'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # ------------------------------------------------------------------
    # 2. Create contracts table
    # ------------------------------------------------------------------
    op.create_table(
        "contracts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("contract_number", sa.String(50), nullable=False),
        sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("department_id", sa.Integer(), nullable=False),
        sa.Column("job_position_id", sa.Integer(), nullable=False),
        sa.Column("salary_structure_id", sa.Integer(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("wage", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "status",
            contractstatus_enum,
            server_default="DRAFT",
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
        sa.ForeignKeyConstraint(
            ["employee_id"],
            ["employees.id"],
            name="fk_contracts_employee_id_employees",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["department_id"],
            ["departments.id"],
            name="fk_contracts_department_id_departments",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["job_position_id"],
            ["job_positions.id"],
            name="fk_contracts_job_position_id_job_positions",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("contract_number", name="uq_contracts_contract_number"),
    )

    op.create_index("ix_contracts_contract_number", "contracts", ["contract_number"], unique=True)
    op.create_index("ix_contracts_employee_id", "contracts", ["employee_id"], unique=False)
    op.create_index("ix_contracts_department_id", "contracts", ["department_id"], unique=False)
    op.create_index("ix_contracts_job_position_id", "contracts", ["job_position_id"], unique=False)
    op.create_index("ix_contracts_status", "contracts", ["status"], unique=False)


def downgrade() -> None:
    # ------------------------------------------------------------------
    # Drop contracts table and indexes
    # ------------------------------------------------------------------
    op.drop_index("ix_contracts_status", table_name="contracts")
    op.drop_index("ix_contracts_job_position_id", table_name="contracts")
    op.drop_index("ix_contracts_department_id", table_name="contracts")
    op.drop_index("ix_contracts_employee_id", table_name="contracts")
    op.drop_index("ix_contracts_contract_number", table_name="contracts")
    op.drop_table("contracts")
    contractstatus_enum.drop(op.get_bind(), checkfirst=True)
