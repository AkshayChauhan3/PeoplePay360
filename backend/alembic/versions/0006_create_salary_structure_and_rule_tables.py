"""create salary structure and rule tables

Revision ID: 0006
Revises: 0005
Create Date: 2026-09-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers
revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Enums
salaryrulecategory_enum = postgresql.ENUM(
    "BASIC",
    "ALLOWANCE",
    "GROSS",
    "DEDUCTION",
    "NET",
    name="salaryrulecategory",
    create_type=False,
)

computationtype_enum = postgresql.ENUM(
    "FIXED",
    "PERCENTAGE",
    "FORMULA",
    name="computationtype",
    create_type=False,
)


def upgrade() -> None:
    # 1. Create Enums
    salaryrulecategory_enum.create(op.get_bind(), checkfirst=True)
    computationtype_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create salary_structures table
    op.create_table(
        "salary_structures",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
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
        sa.UniqueConstraint("name", name="uq_salary_structures_name"),
        sa.UniqueConstraint("code", name="uq_salary_structures_code"),
    )
    op.create_index(
        op.f("ix_salary_structures_name"),
        "salary_structures",
        ["name"],
        unique=True,
    )
    op.create_index(
        op.f("ix_salary_structures_code"),
        "salary_structures",
        ["code"],
        unique=True,
    )

    # 3. Create salary_rules table
    op.create_table(
        "salary_rules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("salary_structure_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
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
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column(
            "computation_type",
            postgresql.ENUM(
                "FIXED",
                "PERCENTAGE",
                "FORMULA",
                name="computationtype",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("fixed_amount", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("percentage", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("percentage_base", sa.String(length=50), nullable=True),
        sa.Column("formula", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
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
            name="fk_salary_rules_salary_structure_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "salary_structure_id",
            "code",
            name="uq_salary_rules_structure_code",
        ),
        sa.UniqueConstraint(
            "salary_structure_id",
            "sequence",
            name="uq_salary_rules_structure_sequence",
        ),
    )
    op.create_index(
        op.f("ix_salary_rules_salary_structure_id"),
        "salary_rules",
        ["salary_structure_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_salary_rules_code"),
        "salary_rules",
        ["code"],
        unique=False,
    )
    op.create_index(
        op.f("ix_salary_rules_category"),
        "salary_rules",
        ["category"],
        unique=False,
    )
    op.create_index(
        op.f("ix_salary_rules_sequence"),
        "salary_rules",
        ["sequence"],
        unique=False,
    )

    # 4. Add foreign key from contracts.salary_structure_id to salary_structures.id
    op.create_foreign_key(
        "fk_contracts_salary_structure_id",
        "contracts",
        "salary_structures",
        ["salary_structure_id"],
        ["id"],
        ondelete="SET NULL",
    )
    # Create index on contracts.salary_structure_id if not exists
    op.create_index(
        op.f("ix_contracts_salary_structure_id"),
        "contracts",
        ["salary_structure_id"],
        unique=False,
        if_not_exists=True,
    )


def downgrade() -> None:
    # 1. Drop foreign key and index on contracts
    op.drop_constraint("fk_contracts_salary_structure_id", "contracts", type_="foreignkey")
    op.drop_index(op.f("ix_contracts_salary_structure_id"), table_name="contracts")

    # 2. Drop salary_rules table & indexes
    op.drop_index(op.f("ix_salary_rules_sequence"), table_name="salary_rules")
    op.drop_index(op.f("ix_salary_rules_category"), table_name="salary_rules")
    op.drop_index(op.f("ix_salary_rules_code"), table_name="salary_rules")
    op.drop_index(op.f("ix_salary_rules_salary_structure_id"), table_name="salary_rules")
    op.drop_table("salary_rules")

    # 3. Drop salary_structures table & indexes
    op.drop_index(op.f("ix_salary_structures_code"), table_name="salary_structures")
    op.drop_index(op.f("ix_salary_structures_name"), table_name="salary_structures")
    op.drop_table("salary_structures")

    # 4. Drop Enums
    computationtype_enum.drop(op.get_bind(), checkfirst=True)
    salaryrulecategory_enum.drop(op.get_bind(), checkfirst=True)

