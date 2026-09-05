"""add employee bank details

Revision ID: 0008
Revises: 0007
Create Date: 2026-09-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# Revision identifiers
revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("bank_name", sa.String(length=100), nullable=True))
    op.add_column("employees", sa.Column("bank_account_number", sa.String(length=50), nullable=True))
    op.add_column("employees", sa.Column("ifsc_code", sa.String(length=20), nullable=True))
    op.add_column("employees", sa.Column("pan_number", sa.String(length=20), nullable=True))
    op.add_column("employees", sa.Column("account_holder_name", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("employees", "account_holder_name")
    op.drop_column("employees", "pan_number")
    op.drop_column("employees", "ifsc_code")
    op.drop_column("employees", "bank_account_number")
    op.drop_column("employees", "bank_name")
