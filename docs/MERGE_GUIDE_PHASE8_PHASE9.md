# Complete Zero-Mistake Merge & Integration Runbook

> **Target Audience:** Other Developer / DevOps Engineer  
> **Source Branches:** `origin/main` (Phase 8 & 9: Banking details, payout export, payslip email delivery, seed data)  
> **Feature Branch:** `origin/AkshayChauhan` (Live UI integration, PostgreSQL UUID schema alignment, RBAC, and responsive design)

---

## 1. Executive Summary & Merge Analysis

- **Common Ancestor (Merge Base):** Commit `4b39c6f` (*feat: complete Phase 7 payroll engine with PDF export and root launcher*).
- **Files Affected:** 32 files merge automatically and cleanly.
- **Code Conflicts:** Exactly **2 files** have conflicts:
  1. `backend/app/main.py` (lifespan startup seeding & routers)
  2. `backend/app/models/employee.py` (Phase 8 banking columns + UUID primary key alignment)
- **Database Schema Gotcha (Crucial):** In PostgreSQL, `employees.id` is `UUID`. The new `payslip_email_deliveries` table (Migration `0009`) and `email_delivery.py` model must use `UUID(as_uuid=True)` for `employee_id` so PostgreSQL foreign key constraints succeed without error.

---

## Step 0: Mandatory Preparation on Akshay's Machine

Before the other developer can perform the merge on their machine or on GitHub, the latest 34 modified files on branch `AkshayChauhan` must be committed and pushed to remote.

**Run on Akshay's machine:**
```bash
git status
git add .
git commit -m "feat: complete live frontend-backend integration and UI polish"
git push origin AkshayChauhan
```

---

## Step 1: Initiating the Merge (On Other Developer's Machine)

The other developer should fetch all branches and perform the merge.

```bash
# 1. Fetch latest changes from GitHub
git fetch origin

# 2. Checkout main and ensure it is updated
git checkout main
git pull origin main

# 3. Merge Akshay's branch into main
git merge origin/AkshayChauhan
```

> Git will output:
> ```
> Auto-merging backend/app/main.py
> CONFLICT (content): Merge conflict in backend/app/main.py
> Auto-merging backend/app/models/employee.py
> CONFLICT (content): Merge conflict in backend/app/models/employee.py
> Automatic merge failed; fix conflicts and then commit the result.
> ```

---

## Step 2: Resolving Conflict 1 — `backend/app/main.py`

### What caused the conflict:
- **`main`** added `time_off_type_service.seed_default_time_off_types(session)`.
- **`AkshayChauhan`** added `user_service.seed_default_admin(session)`, compatibility aliases for `/salary`, `/payroll`, and `/timeoff`, plus the root `/` discovery endpoint.

### Solution:
Open `backend/app/main.py` and replace the entire file with the following verified content:

```python
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import (
    attendance,
    auth,
    contracts,
    dashboard,
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
from app.services import (
    role_service,
    schedule_service,
    time_off_type_service,
    user_service,
)

# ---------------------------------------------------------------------------
# Application lifespan (startup / shutdown)
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager: seed initial system roles, default working schedule, time off types, & admin user on startup."""
    async with AsyncSessionLocal() as session:
        await role_service.seed_default_roles(session)
        await schedule_service.seed_default_schedule(session)
        await time_off_type_service.seed_default_time_off_types(session)
        await user_service.seed_default_admin(session)
        await session.commit()
    yield


# ---------------------------------------------------------------------------
# Application instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="PeoplePay360 API",
    description="HR & Payroll Backend — Phase 9: Payslip Email Delivery & Payout Engine",
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
app.include_router(dashboard.router, prefix=API_PREFIX)
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
app.include_router(salary_structures.router, prefix=f"{API_PREFIX}/salary")
app.include_router(salary_rules.router, prefix=f"{API_PREFIX}/salary")
# Phase 7, 8, 9: Payruns & Payslips
app.include_router(payruns.router, prefix=API_PREFIX)
app.include_router(payslips.router, prefix=API_PREFIX)
app.include_router(payruns.router, prefix=f"{API_PREFIX}/payroll")
app.include_router(payslips.router, prefix=f"{API_PREFIX}/payroll")


@app.get("/", tags=["Root"])
async def root():
    """Root landing endpoint providing API info and documentation links."""
    return {
        "name": "PeoplePay360 HRMS & Payroll API",
        "status": "online",
        "version": settings.app_version,
        "docs": "/docs",
        "health": f"{API_PREFIX}/health",
        "frontend_app": "http://localhost:5173",
    }


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
```

---

## Step 3: Resolving Conflict 2 — `backend/app/models/employee.py`

### What caused the conflict:
- **`main`** added 5 corporate payout bank columns (`bank_name`, `bank_account_number`, `ifsc_code`, `pan_number`, `account_holder_name`).
- **`AkshayChauhan`** has PostgreSQL UUID type mapping for `id` and `manager_id`, explicit `EmployeeStatus` Enum with server default, and relationship mappings.

### Solution:
Open `backend/app/models/employee.py` and replace the entire file with the following verified content:

```python
import enum
import uuid
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.attendance import Attendance
    from app.models.contract import Contract
    from app.models.department import Department
    from app.models.job_position import JobPosition
    from app.models.schedule import Schedule
    from app.models.time_off import TimeOffAllocation, TimeOffRequest
    from app.models.user import User


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class EmployeeStatus(str, enum.Enum):
    """
    Operational status of an employee in the system.
    """
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    ON_LEAVE = "ON_LEAVE"
    TERMINATED = "TERMINATED"


class Employee(Base):
    """
    Employee master record matching PostgreSQL table schema.
    """

    __tablename__ = "employees"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        default=uuid.uuid4,
    )

    employee_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    phone: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    date_of_birth: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    joining_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    department_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("departments.id", name="fk_employees_department_id"),
        nullable=False,
        index=True,
    )

    job_position_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("job_positions.id", name="fk_employees_job_position_id"),
        nullable=False,
        index=True,
    )

    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employees.id", name="fk_employees_manager_id"),
        nullable=True,
        index=True,
    )

    working_schedule_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("working_schedules.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ------------------------------------------------------------------
    # Banking & Financial Details (Phase 8: Corporate Payout)
    # ------------------------------------------------------------------
    bank_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    bank_account_number: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    ifsc_code: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    pan_number: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    account_holder_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    status: Mapped[EmployeeStatus] = mapped_column(
        Enum(EmployeeStatus, name="employeestatus", create_type=False),
        nullable=False,
        default=EmployeeStatus.ACTIVE,
        server_default=text("'ACTIVE'"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
        server_default=text("now()"),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
        onupdate=_utcnow,
        server_default=text("now()"),
    )

    # Relationships
    department: Mapped["Department"] = relationship(
        "Department",
        foreign_keys=[department_id],
        back_populates="employees",
    )

    job_position: Mapped["JobPosition"] = relationship(
        "JobPosition",
        foreign_keys=[job_position_id],
        back_populates="employees",
    )

    manager: Mapped["Employee | None"] = relationship(
        "Employee",
        remote_side=[id],
        foreign_keys=[manager_id],
    )

    schedule: Mapped["Schedule | None"] = relationship(
        "Schedule",
        foreign_keys=[working_schedule_id],
        lazy="joined",
    )

    user: Mapped["User | None"] = relationship(
        "User",
        back_populates="employee",
        uselist=False,
    )

    contracts: Mapped[list["Contract"]] = relationship(
        "Contract",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    attendances: Mapped[list["Attendance"]] = relationship(
        "Attendance",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    time_off_allocations: Mapped[list["TimeOffAllocation"]] = relationship(
        "TimeOffAllocation",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    time_off_requests: Mapped[list["TimeOffRequest"]] = relationship(
        "TimeOffRequest",
        back_populates="employee",
        cascade="all, delete-orphan",
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def is_active(self) -> bool:
        return self.status != EmployeeStatus.TERMINATED

    def __repr__(self) -> str:
        return f"<Employee id={self.id} code={self.employee_code!r} name={self.full_name!r}>"
```

---

## Step 4: Critical Schema Alignment for Migration 0009 & Email Delivery Model

Because PostgreSQL stores `employees.id` as `UUID`, foreign key columns referencing `employees.id` must be of type `UUID`.

### 1. In `backend/alembic/versions/0009_create_payslip_email_deliveries_table.py`:
Change line 34 from:
```python
sa.Column("employee_id", sa.Integer(), nullable=False),
```
To:
```python
sa.Column("employee_id", postgresql.UUID(as_uuid=True), nullable=False),
```

### 2. In `backend/app/models/email_delivery.py`:
Ensure imports include UUID:
```python
import uuid
from sqlalchemy.dialects.postgresql import UUID
```
And change line 77 from:
```python
employee_id: Mapped[int] = mapped_column(
    Integer,
    ForeignKey("employees.id", ondelete="CASCADE"),
    index=True,
    nullable=False,
)
```
To:
```python
employee_id: Mapped[uuid.UUID] = mapped_column(
    UUID(as_uuid=True),
    ForeignKey("employees.id", ondelete="CASCADE"),
    index=True,
    nullable=False,
)
```

### 3. In `backend/app/schemas/email_delivery.py`:
Ensure `import uuid` is present at the top, and update `employee_id`:
```python
# In PayslipEmailDeliveryItem:
employee_id: uuid.UUID

# In SinglePayslipEmailResponse:
employee_id: uuid.UUID
```

---

## Step 5: Committing the Merge in Git

Stage the resolved and aligned files and complete the merge commit:

```bash
git add backend/app/main.py
git add backend/app/models/employee.py
git add backend/alembic/versions/0009_create_payslip_email_deliveries_table.py
git add backend/app/models/email_delivery.py
git add backend/app/schemas/email_delivery.py

git commit -m "merge: integrate Phase 8 & 9 banking and email features with live frontend-backend integration"
```

---

## Step 6: Executing Database Migrations

Run Alembic to upgrade PostgreSQL schema to latest revisions (`0008` & `0009`):

```bash
cd backend

# Activate virtual environment
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate

# Apply migrations
alembic upgrade head

# Verify current revision shows 0009 (head)
alembic current
```

*(Optional)* If you wish to populate the database with the 400 test employees and seed contracts:
```bash
python seed_data.py
```

---

## Step 7: Complete Verification & Testing Checklist

### 1. Run Automated Backend Tests
```bash
cd backend
pytest -v
```
*(All test suites for auth, employees, contracts, attendance, time-off, salary rules, payruns, bank payouts, and email delivery should pass).*

### 2. Verify Frontend Production Build
```bash
cd ../frontend
npm run build
```
*(Should output `✓ built in ~250ms` with zero bundle errors).*

### 3. Start Both Servers and Perform End-to-End Verification
- **Backend:**
  ```bash
  cd backend
  python run.py
  # or uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  ```
  Visit: `http://localhost:8000/docs` to see the complete interactive API documentation.
- **Frontend:**
  ```bash
  cd frontend
  npm run dev
  ```
  Visit: `http://localhost:5173` in your browser.

### 4. Live Login Credentials:
- **System Admin:** `admin@peoplepay360.com` / `Admin@123`
- **HR Manager:** `hrmanager@peoplepay360.com` / `HrManager@123`
- **Employee User:** `employee@peoplepay360.com` / `Employee@123`
