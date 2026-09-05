"""
Alembic Environment Script (Async-enabled).

This script orchestrates Alembic database migrations.
Key features:
1. Loads settings directly from the application environment (Settings.database_url)
   so that passwords/credentials are never committed to alembic.ini.
2. Imports `app.db.base.Base` which registers all SQLAlchemy ORM models, enabling
   Alembic autogenerate to detect table schema changes.
3. Uses SQLAlchemy's async engine + connection.run_sync() to execute synchronous
   migration DDL inside an asynchronous event loop.
"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.core.config import settings
from app.db.base import Base  # noqa: F401 — triggers all model imports for metadata

# ---------------------------------------------------------------------------
# 1. Alembic Configuration
# ---------------------------------------------------------------------------
# Load configuration options defined in alembic.ini
config = context.config

# Dynamically override the database URL from Pydantic settings.
# Escape '%' to '%%' for ConfigParser compatibility (e.g. url-encoded passwords like %40).
config.set_main_option("sqlalchemy.url", settings.database_url.replace("%", "%%"))

# Set up Python logging if alembic.ini specifies a logging config file
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Provide SQLAlchemy metadata to Alembic so it can autogenerate migrations
target_metadata = Base.metadata


# ---------------------------------------------------------------------------
# 2. Offline Migrations (Generates SQL script without executing)
# ---------------------------------------------------------------------------
def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    In offline mode, Alembic generates raw SQL DDL output to standard output
    or a file without opening a live socket connection to the PostgreSQL server.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,  # Detect column type changes (e.g., VARCHAR length changes)
    )
    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# 3. Synchronous Migration Execution Callback
# ---------------------------------------------------------------------------
def do_run_migrations(connection: Connection) -> None:
    """
    Callback that executes migrations synchronously on an open connection.

    Alembic's core migration runners expect a synchronous DBAPI connection.
    When using asyncpg, this callback is invoked via `connection.run_sync()`.
    """
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,  # Detect changes in column types during autogenerate
    )
    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# 4. Async Migration Runner
# ---------------------------------------------------------------------------
async def run_async_migrations() -> None:
    """
    Create an asynchronous engine and execute migrations inside an async context.

    Uses `NullPool` so that connections are immediately closed after migration,
    preventing open socket leaks during deployment pipelines.
    """
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        # run_sync bridges the async connection with Alembic's sync migration runner
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """Entry point for online migrations: boots the asyncio event loop."""
    asyncio.run(run_async_migrations())


# ---------------------------------------------------------------------------
# 5. Dispatch based on execution mode
# ---------------------------------------------------------------------------
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
