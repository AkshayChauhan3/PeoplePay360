"""add department_id to job_positions

Revision ID: 0012
Revises: 0011
Create Date: 2026-09-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# Revision identifiers
revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "job_positions",
        sa.Column(
            "department_id",
            sa.Integer(),
            nullable=True,
            comment="Optional owning department for this job position",
        ),
    )
    op.create_index(
        "ix_job_positions_department_id",
        "job_positions",
        ["department_id"],
    )
    op.create_foreign_key(
        "fk_job_positions_department_id_departments",
        "job_positions",
        "departments",
        ["department_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_job_positions_department_id_departments",
        "job_positions",
        type_="foreignkey",
    )
    op.drop_index("ix_job_positions_department_id", table_name="job_positions")
    op.drop_column("job_positions", "department_id")
