"""create schedule and attendance tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# Revision identifiers
revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

attendancestatus_enum = postgresql.ENUM(
    "PRESENT",
    "LATE",
    "ABSENT",
    "INCOMPLETE",
    "HALF_DAY",
    name="attendancestatus",
    create_type=False,
)


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Create attendancestatus ENUM type idempotently
    # ------------------------------------------------------------------
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE attendancestatus AS ENUM (
                'PRESENT', 'LATE', 'ABSENT', 'INCOMPLETE', 'HALF_DAY'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # ------------------------------------------------------------------
    # 2. Create working_schedules table
    # ------------------------------------------------------------------
    op.create_table(
        "working_schedules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("calendar_type", sa.String(50), server_default="STANDARD", nullable=False),
        sa.Column("hours_per_week", sa.Numeric(precision=5, scale=2), server_default="40.00", nullable=False),
        sa.Column("days_per_week", sa.Integer(), server_default="5", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_working_schedules_name"),
    )
    op.create_index("ix_working_schedules_name", "working_schedules", ["name"])

    # ------------------------------------------------------------------
    # 3. Create working_schedule_days table
    # ------------------------------------------------------------------
    op.create_table(
        "working_schedule_days",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("schedule_id", sa.Integer(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("break_minutes", sa.Integer(), server_default="60", nullable=False),
        sa.Column("work_hours", sa.Numeric(precision=4, scale=2), server_default="8.00", nullable=False),
        sa.ForeignKeyConstraint(["schedule_id"], ["working_schedules.id"], name="fk_working_schedule_days_schedule_id", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("schedule_id", "day_of_week", name="uq_working_schedule_days_schedule_day"),
    )
    op.create_index("ix_working_schedule_days_schedule_id", "working_schedule_days", ["schedule_id"])

    # ------------------------------------------------------------------
    # 4. Add working_schedule_id to employees table
    # ------------------------------------------------------------------
    op.add_column("employees", sa.Column("working_schedule_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_employees_working_schedule_id_working_schedules",
        "employees",
        "working_schedules",
        ["working_schedule_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_employees_working_schedule_id", "employees", ["working_schedule_id"])

    # ------------------------------------------------------------------
    # 5. Create attendances table
    # ------------------------------------------------------------------
    op.create_table(
        "attendances",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("attendance_date", sa.Date(), nullable=False),
        sa.Column("check_in", sa.DateTime(timezone=True), nullable=False),
        sa.Column("check_out", sa.DateTime(timezone=True), nullable=True),
        sa.Column("worked_minutes", sa.Integer(), server_default="0", nullable=False),
        sa.Column("late_minutes", sa.Integer(), server_default="0", nullable=False),
        sa.Column("overtime_minutes", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "status",
            attendancestatus_enum,
            server_default="INCOMPLETE",
            nullable=False,
        ),
        sa.Column("is_manual_edit", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("correction_reason", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["employee_id"],
            ["employees.id"],
            name="fk_attendances_employee_id_employees",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("employee_id", "attendance_date", name="uq_attendances_employee_date"),
    )
    op.create_index("ix_attendances_employee_id", "attendances", ["employee_id"])
    op.create_index("ix_attendances_attendance_date", "attendances", ["attendance_date"])
    op.create_index("ix_attendances_status", "attendances", ["status"])

    # ------------------------------------------------------------------
    # 6. Seed Default Standard 40 Hours/Week Schedule
    # ------------------------------------------------------------------
    op.execute("""
        INSERT INTO working_schedules (name, calendar_type, hours_per_week, days_per_week, is_active)
        VALUES ('Standard 40 Hours/Week', 'STANDARD', 40.00, 5, true)
        ON CONFLICT (name) DO NOTHING;
    """)
    op.execute("""
        DO $$
        DECLARE
            v_sched_id integer;
        BEGIN
            SELECT id INTO v_sched_id FROM working_schedules WHERE name = 'Standard 40 Hours/Week';
            IF v_sched_id IS NOT NULL THEN
                -- Monday (0) to Friday (4): 09:00:00 to 18:00:00, 60m break, 8h work
                FOR d IN 0..4 LOOP
                    INSERT INTO working_schedule_days (schedule_id, day_of_week, start_time, end_time, break_minutes, work_hours)
                    VALUES (v_sched_id, d, '09:00:00', '18:00:00', 60, 8.00)
                    ON CONFLICT (schedule_id, day_of_week) DO NOTHING;
                END LOOP;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # 1. Drop attendances table and indexes
    op.drop_index("ix_attendances_status", table_name="attendances")
    op.drop_index("ix_attendances_attendance_date", table_name="attendances")
    op.drop_index("ix_attendances_employee_id", table_name="attendances")
    op.drop_table("attendances")

    # 2. Drop attendancestatus ENUM
    op.execute("DROP TYPE IF EXISTS attendancestatus;")

    # 3. Drop working_schedule_id from employees
    op.drop_constraint("fk_employees_working_schedule_id_working_schedules", "employees", type_="foreignkey")
    op.drop_index("ix_employees_working_schedule_id", table_name="employees")
    op.drop_column("employees", "working_schedule_id")

    # 4. Drop working_schedule_days table
    op.drop_index("ix_working_schedule_days_schedule_id", table_name="working_schedule_days")
    op.drop_table("working_schedule_days")

    # 5. Drop working_schedules table
    op.drop_index("ix_working_schedules_name", table_name="working_schedules")
    op.drop_table("working_schedules")

