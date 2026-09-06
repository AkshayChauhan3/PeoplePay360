"""email delivery hardening

Revision ID: 0010
Revises: 0009
Create Date: 2026-09-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers
revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Add SENDING to emaildeliverystatus enum if on PostgreSQL
    if bind.dialect.name == "postgresql":
        # Check if SENDING exists
        op.execute(sa.text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
                    WHERE pg_type.typname = 'emaildeliverystatus' AND pg_enum.enumlabel = 'SENDING'
                ) THEN
                    ALTER TYPE emaildeliverystatus ADD VALUE 'SENDING' AFTER 'PENDING';
                END IF;
            END $$;
        """))

        # Create emailfailuretype enum
        email_failure_type = postgresql.ENUM(
            "TEMPORARY",
            "PERMANENT",
            name="emailfailuretype",
            create_type=False,
        )
        email_failure_type.create(bind, checkfirst=True)
        failure_type_col = sa.Column("failure_type", email_failure_type, nullable=True)
    else:
        failure_type_col = sa.Column("failure_type", sa.String(20), nullable=True)

    # 2. Add new columns to payslip_email_deliveries
    op.add_column(
        "payslip_email_deliveries",
        sa.Column("attempt_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column("payslip_email_deliveries", failure_type_col)
    op.add_column(
        "payslip_email_deliveries",
        sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "payslip_email_deliveries",
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "payslip_email_deliveries",
        sa.Column("job_id", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "payslip_email_deliveries",
        sa.Column("storage_key", sa.String(length=255), nullable=True),
    )

    # 3. Create indexes
    op.create_index(
        "ix_payslip_email_deliveries_job_id",
        "payslip_email_deliveries",
        ["job_id"],
    )
    op.create_index(
        "ix_payslip_email_deliveries_status_next_retry",
        "payslip_email_deliveries",
        ["status", "next_retry_at"],
    )

    # 4. Add pdf_storage_key to payslips table
    op.add_column(
        "payslips",
        sa.Column("pdf_storage_key", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("payslips", "pdf_storage_key")
    op.drop_index("ix_payslip_email_deliveries_status_next_retry", table_name="payslip_email_deliveries")
    op.drop_index("ix_payslip_email_deliveries_job_id", table_name="payslip_email_deliveries")
    op.drop_column("payslip_email_deliveries", "storage_key")
    op.drop_column("payslip_email_deliveries", "job_id")
    op.drop_column("payslip_email_deliveries", "next_retry_at")
    op.drop_column("payslip_email_deliveries", "last_attempt_at")
    op.drop_column("payslip_email_deliveries", "failure_type")
    op.drop_column("payslip_email_deliveries", "attempt_count")

