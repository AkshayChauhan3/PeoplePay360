# PeoplePay360 — Complete Startup Guide (`STARTUP.md`)

This guide provides step-by-step instructions to set up, configure, run, test, and troubleshoot the **PeoplePay360** HR & Payroll Management backend on Linux / Fedora.

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Project Architecture Overview](#2-project-architecture-overview)
3. [Step 1: PostgreSQL Setup & Verification](#3-step-1-postgresql-setup--verification)
4. [Step 2: Backend Environment Configuration](#4-step-2-backend-environment-configuration)
5. [Step 3: Database Migrations & Seeding](#5-step-3-database-migrations--seeding)
6. [Step 4: Starting the Application Server](#6-step-4-starting-the-application-server)
7. [Step 5: First-Time User & Data Onboarding Walkthrough](#7-step-5-first-time-user--data-onboarding-walkthrough)
8. [Step 6: Running Automated Tests](#8-step-6-running-automated-tests)
9. [Step 7: Daily One-Liner Quickstart](#9-step-7-daily-one-liner-quickstart)
10. [Troubleshooting & Common Issues](#10-troubleshooting--common-issues)

---

## 1. System Requirements

Ensure the following tools are installed on your Linux / Fedora system:

| Tool | Recommended Version | Check Command |
|---|---|---|
| **Python** | 3.12+ | `python3 --version` |
| **PostgreSQL** | 14+ (tested on 18.x) | `psql --version` |
| **pip** & **venv** | Latest | `python3 -m pip --version` |
| **curl** | Standard Linux utility | `curl --version` |
| **Git** | 2.40+ | `git --version` |

---

## 2. Project Architecture Overview

```
PeoplePay360/
├── STARTUP.md               ← This startup guide
├── README.md                ← Project overview & stack description
├── contracts/
│   └── openapi.yaml         ← Canonical OpenAPI specification
├── docs/
│   ├── DATABASE_SCHEMA.md   ← Full relational schema & ER diagrams
│   └── imp_plans/           ← Phase plans & architecture records
└── backend/                 ← FastAPI backend application
    ├── .env                 ← Secret environment variables (do NOT commit)
    ├── .env.example         ← Template for configuration
    ├── .venv/               ← Python virtual environment
    ├── pyproject.toml       ← Project dependencies & metadata
    ├── alembic.ini          ← Database migration configuration
    ├── alembic/versions/    ← Database migration scripts (0001, 0002, 0003)
    ├── app/
    │   ├── main.py          ← FastAPI instance, middleware, and lifespan
    │   ├── api/             ← API endpoints (auth, roles, departments, employees, contracts, etc.)
    │   ├── core/            ← Security, password hashing, JWT, app settings
    │   ├── db/              ← Async engine & session setup
    │   ├── models/          ← SQLAlchemy ORM models
    │   ├── schemas/         ← Pydantic request/response schemas
    │   └── services/        ← Business logic layer
    └── tests/               ← Pytest test suite (67+ passing tests)
```

---

## 3. Step 1: PostgreSQL Setup & Verification

PeoplePay360 uses PostgreSQL with `asyncpg` for high-performance asynchronous operations.

### 3.1 Verify PostgreSQL Service Status

Check if PostgreSQL is running and accepting connections on port 5432:

```bash
pg_isready -h localhost -p 5432
```

If it reports `accepting connections`, proceed to [Step 3.3](#33-verify-database-and-tables).

If PostgreSQL is not running:
```bash
sudo systemctl start postgresql
# Verify status:
sudo systemctl status postgresql
```

### 3.2 Create Database & User (Clean Setup Only)

If you are setting up on a fresh machine or new database instance:

```bash
# Connect as postgres superuser
sudo -u postgres psql
```

Execute in the PostgreSQL prompt:
```sql
-- 1. Create dedicated user
CREATE USER peoplepay360 WITH PASSWORD 'StrongPassword123';

-- 2. Create database owned by this user
CREATE DATABASE peoplepay360 OWNER peoplepay360;

-- 3. Grant full privileges
GRANT ALL PRIVILEGES ON DATABASE peoplepay360 TO peoplepay360;

-- Exit psql
\q
```

### 3.3 Verify Database and Tables

Verify that you can log into the database with the user credentials:

```bash
PGPASSWORD=StrongPassword123 psql -h localhost -U peoplepay360 -d peoplepay360 -c "\dt"
```

Expected tables (after migrations in Step 3):
- `alembic_version`
- `roles`
- `departments`
- `job_positions`
- `employees`
- `contracts`
- `users`

---

## 4. Step 2: Backend Environment Configuration

### 4.1 Enter Backend Directory & Activate Virtual Environment

```bash
cd /home/akshaychauhan/Playground/PeoplePay360/backend

# Create virtual environment if not already present:
python3 -m venv .venv

# Activate virtual environment:
source .venv/bin/activate
```

> **Note**: Always ensure `(.venv)` appears at the beginning of your terminal prompt.

### 4.2 Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
# Alternatively, install editable package with dev dependencies:
pip install -e ".[dev]"
```

### 4.3 Configure `.env` File

Check or create `backend/.env`. If missing, copy from template:
```bash
cp .env.example .env
```

Ensure your `backend/.env` contains the following settings:

```dotenv
# Database Connection (PostgreSQL + AsyncPG)
DATABASE_URL=postgresql+asyncpg://peoplepay360:StrongPassword123@localhost:5432/peoplepay360

# JWT Authentication Secret Key (64-byte random hex)
# Generate via: python3 -c "import secrets; print(secrets.token_hex(64))"
SECRET_KEY=ffc73f9919d4d8cb3d8ae8bf8105a0f24b01255e87816a695c08ef82d08fb04805922d549f936c222d7c93a772bcef24da72a6a876a4f6a9708f26be541d1b95

# JWT Settings
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS Allowed Origins
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Application Environment
APP_ENV=development
```

---

## 5. Step 3: Database Migrations & Seeding

Migrations are managed with Alembic.

### 5.1 Run Migrations Up to Latest

From within the `backend/` directory (with `.venv` active):

```bash
alembic upgrade head
```

You should see output similar to:
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 0001, create initial tables
INFO  [alembic.runtime.migration] Running upgrade 0001 -> 0002, create employee and hr master data tables
INFO  [alembic.runtime.migration] Running upgrade 0002 -> 0003, create contracts table
```

### 5.2 Verify Current Migration Level

```bash
alembic current
```
Output should show: `0003 (head)`.

### 5.3 Default Role Seeding

You do **not** need to manually seed roles. The FastAPI application lifespan (`app/main.py`) automatically checks and seeds the 5 default system roles on startup:

| ID | Role Name | Description |
|---|---|---|
| `1` | `EMPLOYEE` | Standard employee with self-service access |
| `2` | `HR_MANAGER` | Human Resources Manager with employee and master data management |
| `3` | `HR_PAYROLL_USER` | HR Payroll Specialist with employee and payroll operations access |
| `4` | `HR_PAYROLL_MANAGER` | HR Payroll Manager with full HR and payroll operations access |
| `5` | `ADMIN` | System Administrator with full unrestricted access |

---

## 6. Step 4: Starting the Application Server

### 6.1 Start FastAPI with Uvicorn (Development Mode)

From the `backend/` directory with `.venv` active:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Expected startup logs:
```
INFO:     Will watch for changes in: ['/home/akshaychauhan/Playground/PeoplePay360/backend']
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxx] using StatReload
INFO:     Started server process [xxxx]
INFO:     Waiting for application startup.
INFO:     Default roles already present.
INFO:     Application startup complete.
```

### 6.2 Check Server Health

In another terminal window:
```bash
curl -s http://localhost:8000/api/v1/health
```
Expected response:
```json
{"status":"ok","version":"0.0.1"}
```

### 6.3 Interactive API Documentation

Open your browser to access interactive documentation:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI JSON**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## 7. Step 5: First-Time User & Data Onboarding Walkthrough

Follow this 5-minute walkthrough via Swagger UI ([http://localhost:8000/docs](http://localhost:8000/docs)) or `curl`:

### Step 5.1: List Available Roles (Public - No Login Required)

```bash
curl -s http://localhost:8000/api/v1/roles
```
Notice `ADMIN` has `id: 5` and `EMPLOYEE` has `id: 1`.

---

### Step 5.2: Register Your Initial Admin Account

> **Password Policy**:
> - Minimum **8 characters**
> - At least **1 uppercase letter** (`A-Z`)
> - At least **1 digit** (`0-9`)

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@peoplepay360.com",
    "password": "AdminPassword123",
    "role_id": 5
  }'
```

Response (HTTP 201 Created):
```json
{
  "id": 1,
  "email": "admin@peoplepay360.com",
  "role_id": 5,
  "role": "ADMIN",
  "is_active": true,
  "employee_id": null,
  "created_at": "2026-09-05T12:00:00Z"
}
```

---

### Step 5.3: Login to Obtain JWT Access Token

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@peoplepay360.com",
    "password": "AdminPassword123"
  }'
```

Response (HTTP 200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Copy the `access_token`. In Swagger UI:
1. Click the green **Authorize 🔓** button at the top right of the page.
2. Enter your token (or `Bearer <your_token>`).
3. Click **Authorize** and then **Close**. All subsequent requests in Swagger UI will now carry your credentials!

---

### Step 5.4: Create Department & Job Position

#### 1. Create Department:
```bash
curl -X POST http://localhost:8000/api/v1/departments \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering",
    "code": "ENG"
  }'
```

#### 2. Create Job Position:
```bash
curl -X POST http://localhost:8000/api/v1/job-positions \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Software Engineer",
    "department_id": 1
  }'
```

---

### Step 5.5: Create Employee & Contract

#### 1. Create Employee:
```bash
curl -X POST http://localhost:8000/api/v1/employees \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Akshay",
    "last_name": "Chauhan",
    "email": "akshay@example.com",
    "department_id": 1,
    "job_position_id": 1,
    "date_of_joining": "2026-09-01"
  }'
```

#### 2. Create Contract for Employee:
```bash
curl -X POST http://localhost:8000/api/v1/contracts \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 1,
    "contract_number": "CNT-2026-0001",
    "start_date": "2026-09-01",
    "end_date": "2027-08-31",
    "wage": 85000.00,
    "department_id": 1,
    "job_position_id": 1,
    "status": "active"
  }'
```

---

## 8. Step 6: Running Automated Tests

The test suite runs against the test database asynchronously using `pytest-asyncio` and `httpx`.

> **Safety Notice**: Database cleanup in `conftest.py` uses explicit table truncations/rollbacks. It will **never** drop or delete your database tables.

### Run All Tests

```bash
cd /home/akshaychauhan/Playground/PeoplePay360/backend
source .venv/bin/activate
pytest tests/ -v
```

Expected result:
```
============================== 67 passed in ~4.5s ==============================
```

### Run Tests by Domain

```bash
# Authentication & User Management (23 tests)
pytest tests/test_auth.py -v

# Roles (Public & Admin management)
pytest tests/test_roles.py -v

# Departments & Job Positions
pytest tests/test_departments.py -v
pytest tests/test_job_positions.py -v

# Employee Master Data
pytest tests/test_employees.py -v

# Contracts (18 tests)
pytest tests/test_contracts.py -v
```

---

## 9. Step 7: Daily One-Liner Quickstart

When returning to work on PeoplePay360 each day:

```bash
# 1. Ensure Postgres is running
pg_isready -h localhost -p 5432 || sudo systemctl start postgresql

# 2. Launch FastAPI backend
cd /home/akshaychauhan/Playground/PeoplePay360/backend && \
source .venv/bin/activate && \
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open [http://localhost:8000/docs](http://localhost:8000/docs) and you are ready to code!

---

## 10. Troubleshooting & Common Issues

### 10.1 `ERROR: relation "users" (or "employees", "contracts") does not exist`
- **Cause**: Alembic migrations have not been applied to the current database.
- **Fix**:
  ```bash
  cd backend
  source .venv/bin/activate
  alembic upgrade head
  ```

---

### 10.2 `422 Unprocessable Content` on `/api/v1/auth/register`
- **Cause**: Password fails validation rules.
- **Fix**: Ensure your password satisfies:
  - Minimum 8 characters
  - Contains at least 1 uppercase letter (`A-Z`)
  - Contains at least 1 numeric digit (`0-9`)
  - *Example valid password*: `PeoplePay360Secure!`

---

### 10.3 `401 Unauthorized` / `Could not validate credentials`
- **Cause**: Missing or expired Bearer token in the `Authorization` header.
- **Fix**:
  1. Call `POST /api/v1/auth/login` to get a fresh `access_token`.
  2. If using Swagger UI, click **Authorize** and input the token.
  3. If using `curl`, add header `-H "Authorization: Bearer <access_token>"`.

---

### 10.4 `ConnectionRefusedError: [Errno 111] Connect call failed ('127.0.0.1', 5432)`
- **Cause**: PostgreSQL service is stopped.
- **Fix**:
  ```bash
  sudo systemctl start postgresql
  pg_isready -h localhost -p 5432
  ```

---

### 10.5 Git Index Issue: `fatal: index file smaller than expected`
- **Cause**: Abrupt termination or lock during git staging.
- **Fix**:
  ```bash
  cd /home/akshaychauhan/Playground/PeoplePay360
  rm -f .git/index
  git reset
  ```

---

### 10.6 Port 8000 Already in Use
- **Cause**: A background instance of Uvicorn or another server is occupying port 8000.
- **Fix**:
  ```bash
  # Identify process using port 8000
  lsof -i :8000
  # Or kill the process occupying port 8000
  fuser -k 8000/tcp
  ```

