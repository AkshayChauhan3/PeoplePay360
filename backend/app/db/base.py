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
    company as _company_model,
    contract as _contract_model,
    department as _department_model,
    employee as _employee_model,
    schedule as _schedule_model,
    user as _user_model,
)


