"""create payslip email deliveries table

Revision ID: 0009
Revises: 0008
Create Date: 2026-09-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers
revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create Enum type for delivery status
    status_enum = postgresql.ENUM(
        "PENDING",
        "SENT",
        "FAILED",
        name="emaildeliverystatus",
        create_type=False,
    )
    status_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create payslip_email_deliveries table
    op.create_table(
        "payslip_email_deliveries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("payrun_id", sa.Integer(), nullable=False),
        sa.Column("payslip_id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("recipient_email", sa.String(length=255), nullable=False),
        sa.Column("recipient_name", sa.String(length=200), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column(
            "status",
            status_enum,
            server_default="PENDING",
            nullable=False,
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["employee_id"],
            ["employees.id"],
            name="fk_payslip_email_deliveries_employee_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["payrun_id"],
            ["payruns.id"],
            name="fk_payslip_email_deliveries_payrun_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["payslip_id"],
            ["payslips.id"],
            name="fk_payslip_email_deliveries_payslip_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_payslip_email_deliveries"),
        sa.UniqueConstraint(
            "payrun_id",
            "payslip_id",
            name="uq_payslip_email_deliveries_payrun_payslip",
        ),
    )

    # 3. Create indexes for fast filtering
    op.create_index(
        "ix_payslip_email_deliveries_payrun_id",
        "payslip_email_deliveries",
        ["payrun_id"],
    )
    op.create_index(
        "ix_payslip_email_deliveries_payslip_id",
        "payslip_email_deliveries",
        ["payslip_id"],
    )
    op.create_index(
        "ix_payslip_email_deliveries_employee_id",
        "payslip_email_deliveries",
        ["employee_id"],
    )
    op.create_index(
        "ix_payslip_email_deliveries_status",
        "payslip_email_deliveries",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index("ix_payslip_email_deliveries_status", table_name="payslip_email_deliveries")
    op.drop_index("ix_payslip_email_deliveries_employee_id", table_name="payslip_email_deliveries")
    op.drop_index("ix_payslip_email_deliveries_payslip_id", table_name="payslip_email_deliveries")
    op.drop_index("ix_payslip_email_deliveries_payrun_id", table_name="payslip_email_deliveries")
    op.drop_table("payslip_email_deliveries")

    status_enum = postgresql.ENUM(
        "PENDING",
        "SENT",
        "FAILED",
        name="emaildeliverystatus",
    )
    status_enum.drop(op.get_bind(), checkfirst=True)
