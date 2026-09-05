"""
Test fixtures for PeoplePay360.

Strategy: single DATABASE_URL, per-test transaction rollback isolation.
- The schema is created once at the start of the test session.
- Each test runs inside a transaction that is rolled back after the test,
  so every test starts with a clean slate without dropping/recreating tables.
"""

import asyncio
from collections.abc import AsyncGenerator
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.base import Base
from app.db.database import get_db
from app.main import app

# ---------------------------------------------------------------------------
# Async event loop — session-scoped
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def event_loop_policy():
    return asyncio.DefaultEventLoopPolicy()


# ---------------------------------------------------------------------------
# Test engine — reuses the application DATABASE_URL
# ---------------------------------------------------------------------------

_test_engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
)

_TestSessionLocal = async_sessionmaker(
    bind=_test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ---------------------------------------------------------------------------
# Schema setup — once per test session
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables() -> AsyncGenerator[None, None]:
    """Create all tables at the start of the session; drop them after."""
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await _test_engine.dispose()


# ---------------------------------------------------------------------------
# Per-test transactional session (rollback isolation)
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Provide a database session that is rolled back after each test.
    This keeps every test isolated without recreating the schema.
    """
    async with _test_engine.connect() as conn:
        await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)
        try:
            yield session
        finally:
            await session.close()
            await conn.rollback()


# ---------------------------------------------------------------------------
# HTTP client — overrides get_db with the transactional session
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient wired to the test database session."""

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Convenience factories
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def registered_user(async_client: AsyncClient) -> dict[str, Any]:
    """Register a default active user and return the response JSON."""
    response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "TestPass1",
            "role": "EMPLOYEE",
        },
    )
    assert response.status_code == 201
    return response.json()


@pytest_asyncio.fixture
async def auth_tokens(async_client: AsyncClient, registered_user: dict[str, Any]) -> dict[str, str]:
    """Log in the default user and return the token pair."""
    response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "TestPass1"},
    )
    assert response.status_code == 200
    return response.json()

