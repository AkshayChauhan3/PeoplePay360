from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Single SQLAlchemy declarative base for the entire project.

    All ORM models must inherit from this class so that Alembic's
    autogenerate can discover them via Base.metadata.
    """
    pass


# Import every model module here so Alembic and SQLAlchemy see their metadata
# when env.py or database session imports Base.
from app.models import company as _company_model  # noqa: F401, E402
from app.models import contract as _contract_model  # noqa: F401, E402
from app.models import department as _department_model  # noqa: F401, E402
from app.models import employee as _employee_model  # noqa: F401, E402
from app.models import schedule as _schedule_model  # noqa: F401, E402
from app.models import user as _user_model  # noqa: F401, E402


