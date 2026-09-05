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
from app.models import user as _user_model  # noqa: F401, E402

