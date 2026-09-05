from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

engine = create_async_engine(
    settings.database_url,
    echo=not settings.is_production,  # SQL logging in non-production only
    pool_pre_ping=True,               # Detect stale connections before use
    pool_size=10,
    max_overflow=20,
)

# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Avoids lazy-load errors after commit in async context
    autocommit=False,
    autoflush=False,
)


# ---------------------------------------------------------------------------
# FastAPI dependency — request-scoped session
# ---------------------------------------------------------------------------

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield a database session for the duration of a single request.

    - Opens a new session per request.
    - Rolls back on any unhandled exception.
    - Always closes the session when the request completes.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

