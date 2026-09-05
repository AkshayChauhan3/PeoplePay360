"""create payrun and payslip tables

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers
revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Enums
payrunstatus_enum = postgresql.ENUM(
    "DRAFT",
    "COMPUTED",
    "VALIDATED",
    "PAID",
    "CANCELLED",
    name="payrunstatus",
    create_type=False,
)

payslipstatus_enum = postgresql.ENUM(
    "DRAFT",
    "COMPUTED",
    "VALIDATED",
    "PAID",
    "CANCELLED",
    name="payslipstatus",
    create_type=False,
)


def upgrade() -> None:
    # 1. Create Enums
    payrunstatus_enum.create(op.get_bind(), checkfirst=True)
    payslipstatus_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create payruns table
    op.create_table(
        "payruns",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("salary_structure_id", sa.Integer(), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "DRAFT",
                "COMPUTED",
                "VALIDATED",
                "PAID",
                "CANCELLED",
                name="payrunstatus",
                create_type=False,
            ),
            server_default="DRAFT",
            nullable=False,
        ),
        sa.Column("created_by", sa.Integer(), nullable=True),
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
            ["salary_structure_id"],
            ["salary_structures.id"],
            name="fk_payruns_salary_structure_id",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
            name="fk_payruns_created_by",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_payruns_salary_structure_id"),
        "payruns",
        ["salary_structure_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payruns_period_start"),
        "payruns",
        ["period_start"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payruns_period_end"),
        "payruns",
        ["period_end"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payruns_status"),
        "payruns",
        ["status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payruns_created_by"),
        "payruns",
        ["created_by"],
        unique=False,
    )

    # 3. Create payslips table
    op.create_table(
        "payslips",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("payrun_id", sa.Integer(), nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("contract_id", sa.Integer(), nullable=False),
        sa.Column("salary_structure_id", sa.Integer(), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "DRAFT",
                "COMPUTED",
                "VALIDATED",
                "PAID",
                "CANCELLED",
                name="payslipstatus",
                create_type=False,
            ),
            server_default="DRAFT",
            nullable=False,
        ),
        sa.Column(
            "worked_days",
            sa.Numeric(precision=5, scale=2),
            server_default="0.00",
            nullable=False,
        ),
        sa.Column(
            "gross_amount",
            sa.Numeric(precision=12, scale=2),
            server_default="0.00",
            nullable=False,
        ),
        sa.Column(
            "deduction_amount",
            sa.Numeric(precision=12, scale=2),
            server_default="0.00",
            nullable=False,
        ),
        sa.Column(
            "net_amount",
            sa.Numeric(precision=12, scale=2),
            server_default="0.00",
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
        sa.ForeignKeyConstraint(
            ["payrun_id"],
            ["payruns.id"],
            name="fk_payslips_payrun_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["employee_id"],
            ["employees.id"],
            name="fk_payslips_employee_id",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["contract_id"],
            ["contracts.id"],
            name="fk_payslips_contract_id",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["salary_structure_id"],
            ["salary_structures.id"],
            name="fk_payslips_salary_structure_id",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "employee_id",
            "period_start",
            "period_end",
            name="uq_payslips_employee_period",
        ),
    )
    op.create_index(
        op.f("ix_payslips_payrun_id"),
        "payslips",
        ["payrun_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payslips_employee_id"),
        "payslips",
        ["employee_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payslips_contract_id"),
        "payslips",
        ["contract_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payslips_salary_structure_id"),
        "payslips",
        ["salary_structure_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payslips_period_start"),
        "payslips",
        ["period_start"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payslips_period_end"),
        "payslips",
        ["period_end"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payslips_status"),
        "payslips",
        ["status"],
        unique=False,
    )

    # 4. Create payslip_lines table
    op.create_table(
        "payslip_lines",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("payslip_id", sa.Integer(), nullable=False),
        sa.Column("salary_rule_id", sa.Integer(), nullable=True),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column(
            "category",
            postgresql.ENUM(
                "BASIC",
                "ALLOWANCE",
                "GROSS",
                "DEDUCTION",
                "NET",
                name="salaryrulecategory",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("sequence", sa.Integer(), server_default="10", nullable=False),
        sa.Column(
            "amount",
            sa.Numeric(precision=12, scale=2),
            server_default="0.00",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["payslip_id"],
            ["payslips.id"],
            name="fk_payslip_lines_payslip_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["salary_rule_id"],
            ["salary_rules.id"],
            name="fk_payslip_lines_salary_rule_id",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_payslip_lines_payslip_id"),
        "payslip_lines",
        ["payslip_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_payslip_lines_salary_rule_id"),
        "payslip_lines",
        ["salary_rule_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_payslip_lines_salary_rule_id"), table_name="payslip_lines")
    op.drop_index(op.f("ix_payslip_lines_payslip_id"), table_name="payslip_lines")
    op.drop_table("payslip_lines")

    op.drop_index(op.f("ix_payslips_status"), table_name="payslips")
    op.drop_index(op.f("ix_payslips_period_end"), table_name="payslips")
    op.drop_index(op.f("ix_payslips_period_start"), table_name="payslips")
    op.drop_index(op.f("ix_payslips_salary_structure_id"), table_name="payslips")
    op.drop_index(op.f("ix_payslips_contract_id"), table_name="payslips")
    op.drop_index(op.f("ix_payslips_employee_id"), table_name="payslips")
    op.drop_index(op.f("ix_payslips_payrun_id"), table_name="payslips")
    op.drop_table("payslips")

    op.drop_index(op.f("ix_payruns_created_by"), table_name="payruns")
    op.drop_index(op.f("ix_payruns_status"), table_name="payruns")
    op.drop_index(op.f("ix_payruns_period_end"), table_name="payruns")
    op.drop_index(op.f("ix_payruns_period_start"), table_name="payruns")
    op.drop_index(op.f("ix_payruns_salary_structure_id"), table_name="payruns")
    op.drop_table("payruns")

    payslipstatus_enum.drop(op.get_bind(), checkfirst=True)
    payrunstatus_enum.drop(op.get_bind(), checkfirst=True)

