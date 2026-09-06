"""
Test fixtures for PeoplePay360.

Strategy: single DATABASE_URL, per-test transaction rollback isolation.
- The schema is created once at the start of the test session.
- Roles are seeded at the session level so every test has system roles.
- Each test runs inside a transaction that is rolled back after the test.
"""

import asyncio
from collections.abc import AsyncGenerator
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.db.base import Base
from app.db.database import get_db
from app.main import app

# ---------------------------------------------------------------------------
# Test engine — reuses the application DATABASE_URL with NullPool
# ---------------------------------------------------------------------------

_test_engine = create_async_engine(
    settings.database_url,
    echo=False,
    poolclass=NullPool,
)

_TestSessionLocal = async_sessionmaker(
    bind=_test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ---------------------------------------------------------------------------
# Schema setup & role seeding — once per test session
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables() -> AsyncGenerator[None, None]:
    """Create all tables and seed standard roles at the start of the session."""
    from sqlalchemy import text
    async with _test_engine.begin() as conn:
        # Safety guard: only truncate if database name contains '_test' or explicitly enabled
        import os
        db_name = settings.database_url.split("/")[-1].split("?")[0]
        if "_test" in db_name or os.getenv("ALLOW_DEV_DB_TRUNCATE") == "1":
            for t in [
                "payslip_email_deliveries", "payslip_lines", "payslips", "payruns",
                "contracts", "time_off_requests", "time_off_allocations",
                "time_off_types", "attendances", "working_schedule_days",
                "working_schedules", "users", "employees", "job_positions",
                "departments", "salary_rules", "salary_structures",
            ]:
                await conn.execute(text(f"TRUNCATE TABLE {t} CASCADE;"))

    # Seed the standard roles, default schedule, and default time-off types so all tests can reference them
    async with _TestSessionLocal() as session:
        from app.services.role_service import seed_default_roles
        from app.services.schedule_service import seed_default_schedule
        from app.services.time_off_type_service import seed_default_time_off_types
        await seed_default_roles(session)
        await seed_default_schedule(session)
        await seed_default_time_off_types(session)
        await session.commit()

    yield


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
# Convenience factories (Phase 1 backward-compatible)
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def registered_user(async_client: AsyncClient) -> dict[str, Any]:
    """Register a default active user and return the response JSON."""
    response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "TestPass1",
            "role_id": 1,
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


# ---------------------------------------------------------------------------
# Role-based authentication helper fixtures (Phase 2)
# ---------------------------------------------------------------------------

_ROLE_NAME_TO_ID = {
    "EMPLOYEE": 1,
    "HR_MANAGER": 2,
    "HR_PAYROLL_USER": 3,
    "HR_PAYROLL_MANAGER": 4,
    "ADMIN": 5,
}


async def _create_and_login_role_user(async_client: AsyncClient, email: str, role: str) -> dict[str, str]:
    role_id = _ROLE_NAME_TO_ID.get(role, 1)
    await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123",
            "role_id": role_id,
        },
    )
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def admin_auth_headers(async_client: AsyncClient) -> dict[str, str]:
    """Return auth headers for an ADMIN user."""
    return await _create_and_login_role_user(async_client, "admin_user@example.com", "ADMIN")


@pytest_asyncio.fixture
async def hr_manager_auth_headers(async_client: AsyncClient) -> dict[str, str]:
    """Return auth headers for an HR_MANAGER user."""
    return await _create_and_login_role_user(async_client, "hrm_user@example.com", "HR_MANAGER")


@pytest_asyncio.fixture
async def hr_payroll_user_auth_headers(async_client: AsyncClient) -> dict[str, str]:
    """Return auth headers for an HR_PAYROLL_USER user."""
    return await _create_and_login_role_user(async_client, "hrpu_user@example.com", "HR_PAYROLL_USER")


@pytest_asyncio.fixture
async def hr_payroll_manager_auth_headers(async_client: AsyncClient) -> dict[str, str]:
    """Return auth headers for an HR_PAYROLL_MANAGER user."""
    return await _create_and_login_role_user(async_client, "hrpm_user@example.com", "HR_PAYROLL_MANAGER")


@pytest_asyncio.fixture
async def employee_auth_headers(async_client: AsyncClient) -> dict[str, str]:
    """Return auth headers for an EMPLOYEE user."""
    return await _create_and_login_role_user(async_client, "emp_user@example.com", "EMPLOYEE")


@pytest_asyncio.fixture
async def sample_department(async_client: AsyncClient, hr_manager_auth_headers: dict[str, str]) -> dict[str, Any]:
    """Create a sample department and return its JSON response (or existing if already present)."""
    res = await async_client.post(
        "/api/v1/departments",
        json={"name": "Engineering", "code": "ENG", "description": "Software Engineering"},
        headers=hr_manager_auth_headers,
    )
    if res.status_code == 201:
        return res.json()
    if res.status_code == 409:
        fetch = await async_client.get("/api/v1/departments", headers=hr_manager_auth_headers)
        data = fetch.json()
        return data[0] if isinstance(data, list) else data["items"][0]
    assert res.status_code == 201
    return res.json()


@pytest_asyncio.fixture
async def sample_job_position(async_client: AsyncClient, hr_manager_auth_headers: dict[str, str]) -> dict[str, Any]:
    """Create a sample job position and return its JSON response (or existing if already present)."""
    res = await async_client.post(
        "/api/v1/job-positions",
        json={"name": "Software Engineer", "code": "SWE", "description": "Backend Engineer"},
        headers=hr_manager_auth_headers,
    )
    if res.status_code == 201:
        return res.json()
    if res.status_code == 409:
        fetch = await async_client.get("/api/v1/job-positions", headers=hr_manager_auth_headers)
        data = fetch.json()
        return data[0] if isinstance(data, list) else data["items"][0]
    assert res.status_code == 201
    return res.json()




@pytest_asyncio.fixture
async def sample_employee(
    async_client: AsyncClient,
    hr_manager_auth_headers: dict[str, str],
    sample_department: dict[str, Any],
    sample_job_position: dict[str, Any],
) -> dict[str, Any]:
    """Create a sample employee and return their JSON response."""
    res = await async_client.post(
        "/api/v1/employees",
        json={
            "employee_code": "EMP100",
            "first_name": "Test",
            "last_name": "Worker",
            "email": "testworker@example.com",
            "joining_date": "2024-01-01",
            "department_id": sample_department["id"],
            "job_position_id": sample_job_position["id"],
            "status": "ACTIVE",
        },
        headers=hr_manager_auth_headers,
    )
    assert res.status_code == 201
    return res.json()
