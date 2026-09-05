from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import (
    attendance,
    auth,
    contracts,
    departments,
    employees,
    health,
    job_positions,
    payruns,
    payslips,
    roles,
    salary_rules,
    salary_structures,
    schedules,
    time_off,
)
from app.core.config import settings
from app.db.database import AsyncSessionLocal
from app.services import role_service, schedule_service, time_off_type_service

# ---------------------------------------------------------------------------
# Application lifespan (startup / shutdown)
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: seed initial system roles, default working schedule, & time off types on startup."""
    async with AsyncSessionLocal() as session:
        await role_service.seed_default_roles(session)
        await schedule_service.seed_default_schedule(session)
        await time_off_type_service.seed_default_time_off_types(session)
        await session.commit()
    yield


# ---------------------------------------------------------------------------
# Application instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="PeoplePay360 API",
    description="HR & Payroll Backend — Phase 7: Payruns & Payslips",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — origins are loaded from environment; never a wildcard in production
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

API_PREFIX = "/api/v1"

app.include_router(health.router, prefix=API_PREFIX)
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(roles.router, prefix=API_PREFIX)
app.include_router(departments.router, prefix=API_PREFIX)
app.include_router(job_positions.router, prefix=API_PREFIX)
app.include_router(employees.router, prefix=API_PREFIX)
app.include_router(contracts.router, prefix=API_PREFIX)
app.include_router(schedules.router, prefix=API_PREFIX)
app.include_router(attendance.router, prefix=API_PREFIX)
# Time Off endpoints (mounted under /time-off with backwards-compatible alias /timeoff)
app.include_router(time_off.router, prefix=f"{API_PREFIX}/time-off")
app.include_router(time_off.router, prefix=f"{API_PREFIX}/timeoff")
# Phase 6: Salary Structures & Rules
app.include_router(salary_structures.router, prefix=API_PREFIX)
app.include_router(salary_rules.router, prefix=API_PREFIX)
# Phase 7: Payruns & Payslips
app.include_router(payruns.router, prefix=API_PREFIX)
app.include_router(payslips.router, prefix=API_PREFIX)


# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all handler for unhandled exceptions.
    Returns a generic 500 without leaking internal error details.
    """
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred."},
    )
