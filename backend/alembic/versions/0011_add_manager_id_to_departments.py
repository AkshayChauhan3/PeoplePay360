"""add manager_id to departments

Revision ID: 0011
Revises: 0010
Create Date: 2026-09-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# Revision identifiers
revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "departments",
        sa.Column("manager_id", sa.Integer(), nullable=True, comment="Department Head / Manager referencing employees.id"),
    )
    op.create_foreign_key(
        "fk_departments_manager_id_employees",
        "departments",
        "employees",
        ["manager_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_departments_manager_id",
        "departments",
        ["manager_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_departments_manager_id", table_name="departments")
    op.drop_constraint("fk_departments_manager_id_employees", "departments", type_="foreignkey")
    op.drop_column("departments", "manager_id")

