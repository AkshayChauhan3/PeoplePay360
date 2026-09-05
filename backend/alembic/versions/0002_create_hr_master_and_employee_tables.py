"""create hr master and employee tables

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers
revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

employeestatus_enum = postgresql.ENUM(
    "ACTIVE",
    "INACTIVE",
    "ON_LEAVE",
    "TERMINATED",
    name="employeestatus",
    create_type=False,
)


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Create roles table
    # ------------------------------------------------------------------
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
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
        sa.UniqueConstraint("name", name="uq_roles_name"),
    )
    op.create_index("ix_roles_name", "roles", ["name"], unique=True)

    # ------------------------------------------------------------------
    # 2. Seed default roles idempotently
    # ------------------------------------------------------------------
    op.execute("""
        INSERT INTO roles (name, description, is_active)
        VALUES
            ('EMPLOYEE', 'Standard employee with self-service access', true),
            ('HR_MANAGER', 'Human Resources Manager with employee and master data management', true),
            ('HR_PAYROLL_USER', 'HR Payroll Specialist with employee and payroll operations access', true),
            ('HR_PAYROLL_MANAGER', 'HR Payroll Manager with full HR and payroll operations access', true),
            ('ADMIN', 'System Administrator with full unrestricted access', true)
        ON CONFLICT (name) DO NOTHING;
    """)

    # ------------------------------------------------------------------
    # 3. Create departments table
    # ------------------------------------------------------------------
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
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
        sa.UniqueConstraint("name", name="uq_departments_name"),
        sa.UniqueConstraint("code", name="uq_departments_code"),
    )
    op.create_index("ix_departments_name", "departments", ["name"], unique=True)
    op.create_index("ix_departments_code", "departments", ["code"], unique=True)

    # ------------------------------------------------------------------
    # 4. Create job_positions table
    # ------------------------------------------------------------------
    op.create_table(
        "job_positions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("code", sa.String(50), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
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
        sa.UniqueConstraint("name", name="uq_job_positions_name"),
        sa.UniqueConstraint("code", name="uq_job_positions_code"),
    )
    op.create_index("ix_job_positions_name", "job_positions", ["name"], unique=True)
    op.create_index("ix_job_positions_code", "job_positions", ["code"], unique=True)

    # ------------------------------------------------------------------
    # 5. Create employeestatus ENUM type idempotently
    # ------------------------------------------------------------------
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE employeestatus AS ENUM (
                'ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # ------------------------------------------------------------------
    # 6. Create employees table
    # ------------------------------------------------------------------
    op.create_table(
        "employees",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("employee_code", sa.String(50), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("joining_date", sa.Date(), nullable=False),
        sa.Column("department_id", sa.Integer(), nullable=False),
        sa.Column("job_position_id", sa.Integer(), nullable=False),
        sa.Column("manager_id", sa.Integer(), nullable=True),
        sa.Column(
            "status",
            employeestatus_enum,
            server_default="ACTIVE",
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
        sa.ForeignKeyConstraint(["department_id"], ["departments.id"], name="fk_employees_department_id"),
        sa.ForeignKeyConstraint(["job_position_id"], ["job_positions.id"], name="fk_employees_job_position_id"),
        sa.ForeignKeyConstraint(["manager_id"], ["employees.id"], name="fk_employees_manager_id"),
        sa.UniqueConstraint("employee_code", name="uq_employees_employee_code"),
        sa.UniqueConstraint("email", name="uq_employees_email"),
    )
    op.create_index("ix_employees_employee_code", "employees", ["employee_code"], unique=True)
    op.create_index("ix_employees_email", "employees", ["email"], unique=True)
    op.create_index("ix_employees_department_id", "employees", ["department_id"])
    op.create_index("ix_employees_job_position_id", "employees", ["job_position_id"])
    op.create_index("ix_employees_manager_id", "employees", ["manager_id"])

    # ------------------------------------------------------------------
    # 7. Migrate users table to reference roles and employees
    # ------------------------------------------------------------------
    # Add role_id
    op.add_column("users", sa.Column("role_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_users_role_id_roles", "users", "roles", ["role_id"], ["id"])

    # Backfill role_id from users.role column
    op.execute("""
        UPDATE users
        SET role_id = roles.id
        FROM roles
        WHERE users.role::text = roles.name;
    """)

    # Fallback for any unmatched user rows to default 'EMPLOYEE' role
    op.execute("""
        UPDATE users
        SET role_id = (SELECT id FROM roles WHERE name = 'EMPLOYEE' LIMIT 1)
        WHERE role_id IS NULL;
    """)

    op.alter_column("users", "role_id", nullable=False)
    op.create_index("ix_users_role_id", "users", ["role_id"])

    # Drop old role column
    op.drop_column("users", "role")

    # Drop old emp_id and add employee_id
    op.drop_index("ix_users_emp_id", table_name="users")
    op.drop_column("users", "emp_id")

    op.add_column("users", sa.Column("employee_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_users_employee_id_employees", "users", "employees", ["employee_id"], ["id"])
    op.create_index("ix_users_employee_id", "users", ["employee_id"], unique=True)


def downgrade() -> None:
    # ------------------------------------------------------------------
    # Revert users table changes
    # ------------------------------------------------------------------
    op.drop_index("ix_users_employee_id", table_name="users")
    op.drop_constraint("fk_users_employee_id_employees", "users", type_="foreignkey")
    op.drop_column("users", "employee_id")

    op.add_column("users", sa.Column("emp_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_users_emp_id", "users", ["emp_id"])

    # Restore old role enum column
    userrole_enum = postgresql.ENUM(
        "EMPLOYEE",
        "HR_MANAGER",
        "HR_PAYROLL_USER",
        "HR_PAYROLL_MANAGER",
        "ADMIN",
        name="userrole",
        create_type=False,
    )
    op.add_column(
        "users",
        sa.Column("role", userrole_enum, server_default="EMPLOYEE", nullable=True),
    )
    op.execute("""
        UPDATE users
        SET role = roles.name::userrole
        FROM roles
        WHERE users.role_id = roles.id;
    """)
    op.alter_column("users", "role", nullable=False)

    op.drop_index("ix_users_role_id", table_name="users")
    op.drop_constraint("fk_users_role_id_roles", "users", type_="foreignkey")
    op.drop_column("users", "role_id")

    # ------------------------------------------------------------------
    # Drop employees table
    # ------------------------------------------------------------------
    op.drop_index("ix_employees_manager_id", table_name="employees")
    op.drop_index("ix_employees_job_position_id", table_name="employees")
    op.drop_index("ix_employees_department_id", table_name="employees")
    op.drop_index("ix_employees_email", table_name="employees")
    op.drop_index("ix_employees_employee_code", table_name="employees")
    op.drop_table("employees")
    employeestatus_enum.drop(op.get_bind(), checkfirst=True)

    # ------------------------------------------------------------------
    # Drop job_positions, departments, roles tables
    # ------------------------------------------------------------------
    op.drop_index("ix_job_positions_code", table_name="job_positions")
    op.drop_index("ix_job_positions_name", table_name="job_positions")
    op.drop_table("job_positions")

    op.drop_index("ix_departments_code", table_name="departments")
    op.drop_index("ix_departments_name", table_name="departments")
    op.drop_table("departments")

    op.drop_index("ix_roles_name", table_name="roles")
    op.drop_table("roles")

