from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Single SQLAlchemy declarative base for the entire project.

    All ORM models must inherit from this class so that Alembic's
    autogenerate can discover them via Base.metadata.
    """
    pass


# Import every model module here so Alembic sees their metadata
# when env.py imports Base.
from app.models import (  # noqa: F401, E402
    attendance as _attendance_model,
    company as _company_model,
    contract as _contract_model,
    department as _department_model,
    employee as _employee_model,
    job_position as _job_position_model,
    payrun as _payrun_model,
    payslip as _payslip_model,
    payslip_line as _payslip_line_model,
    role as _role_model,
    salary_rule as _salary_rule_model,
    salary_structure as _salary_structure_model,
    schedule as _schedule_model,
    time_off as _time_off_model,
    user as _user_model,
)


