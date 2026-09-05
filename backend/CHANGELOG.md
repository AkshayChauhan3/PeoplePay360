# Changelog

All notable changes to **PeoplePay360** are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.0.4] — 2026-09-05

### Summary
Phase 4 release — **Attendance Management & Working Schedules**.
Introduces the daily attendance management lifecycle, Working Schedule engine (`WorkingSchedule`, `WorkingScheduleDay`), server-side worked time, late arrival detection, overtime calculation, missing check-out handling, manual correction audit logs, self-service security, and full RBAC.

### Added

#### Database Models (`app/models/`)
- `schedule.py` — `WorkingSchedule` and `WorkingScheduleDay` ORM models mapping weekly schedules, working hours, and shift breaks.
- `attendance.py` — `AttendanceStatus` enum (`PRESENT`, `LATE`, `ABSENT`, `INCOMPLETE`, `HALF_DAY`) and `Attendance` model (`id`, `employee_id`, `attendance_date`, `check_in`, `check_out`, `worked_minutes`, `late_minutes`, `overtime_minutes`, `status`, `is_manual_edit`, `correction_reason`, timestamps) with unique `(employee_id, attendance_date)` constraint.
- `employee.py` — Added `working_schedule_id` foreign key, `working_schedule` relationship, and `attendances` collection.
- `app/db/base.py` — Registered `attendance` and `schedule` in Base metadata.

#### Database Migrations (`alembic/versions/`)
- `0004_create_schedule_and_attendance_tables.py` — Migration creating `working_schedules`, `working_schedule_days`, `attendancestatus` enum, `attendances` table with indexes, constraints, and default "Standard 40 Hours/Week" schedule seeder.

#### Pydantic Schemas (`app/schemas/`)
- `schedule.py` — `ScheduleIn`, `ScheduleOut`, `ScheduleLineIn`, `ScheduleLineOut`.
- `attendance.py` — `AttendanceCheckInRequest`, `AttendanceCheckOutRequest`, `AttendanceCreate`, `AttendanceUpdate`, `AttendanceResponse` (with derived hour properties), `AttendanceSessionResponse` (for UI header widget), `AttendanceListResponse`.

#### Service Layer (`app/services/`)
- `schedule_service.py` — Schedule CRUD, line validation, hours per week calculation, and default schedule seeding.
- `attendance_service.py` — Self-service check-in, check-out, calculation engine (Scenarios A, B, C, D, half-day, non-working days), manual adjustments with mandatory audit reason, and query filtering.

#### API Routers (`app/api/`)
- `schedules.py` — Mounted at `/api/v1/schedules`:
  - `GET /api/v1/schedules` — List schedules.
  - `POST /api/v1/schedules` — Create schedule (HR/Admin).
  - `GET /api/v1/schedules/{id}` — Get schedule details.
- `attendance.py` — Mounted at `/api/v1/attendance`:
  - `POST /api/v1/attendance/check-in` — Self-service check-in for authenticated employee.
  - `POST /api/v1/attendance/check-out` — Self-service check-out.
  - `POST /api/v1/attendance/{id}/check-out` — Check out specific session.
  - `GET /api/v1/attendance/session` — Header widget active session status.
  - `POST /api/v1/attendance` — Manual attendance creation (HR/Admin).
  - `GET /api/v1/attendance` — Filtered attendance list.
  - `GET /api/v1/attendance/{id}` — Attendance detail.
  - `PATCH /api/v1/attendance/{id}` — Manual correction with mandatory reason.
  - `DELETE /api/v1/attendance/{id}` — Delete attendance.
- `employees.py`:
  - `GET /api/v1/employees/me/attendance` — Current employee self-service attendance history.
  - `GET /api/v1/employees/{id}/attendance` — Specific employee attendance history.

#### Tests (`tests/`)
- `test_attendance.py` — 28 comprehensive unit & integration tests covering all calculation scenarios, schedule operations, manual adjustments, self-service security, and RBAC policies.

---

## [0.0.3] — 2026-09-05

### Summary
Phase 3 release — **Employment Contracts**.
Establishes the contract lifecycle engine (`ContractStatus`), remuneration management (`wage` with numeric precision), overlap prevention for active contracts, smart organizational fallbacks, and employee contract history.

### Added

#### Database Models (`app/models/`)
- `contract.py` — `ContractStatus` enum (`DRAFT`, `RUNNING`, `EXPIRED`, `CANCELLED`) and `Contract` ORM model (`id`, `contract_number`, `employee_id`, `department_id`, `job_position_id`, `salary_structure_id`, `start_date`, `end_date`, `wage`, `status`, audit timestamps).
- `employee.py` — Added `contracts` 1:N relationship back-populated from `Contract`.
- `app/db/base.py` — Registered `contract` model in Base declarative metadata.

#### Pydantic Schemas (`app/schemas/`)
- `contract.py` — `ContractCreate` (with date range & wage validation and code normalization), `ContractUpdate` (PATCH semantics), `ContractResponse` (with nested employee, department, and position snapshots), and `ContractListResponse`.

#### Service Layer (`app/services/`)
- `contract_service.py` — Contract CRUD, unique number validation, smart organizational fallback defaults, non-overlapping running contract validation, and lifecycle transitions (`activate_contract`, `cancel_contract`, `get_employee_contracts`).

#### API Routers (`app/api/`)
- `contracts.py` — Mounted at `/api/v1/contracts`:
  - `POST /api/v1/contracts` — Create contract (HR/Admin).
  - `GET /api/v1/contracts` — List contracts with filtering and pagination.
  - `GET /api/v1/contracts/{id}` — Get contract details (HR/Admin or linked Employee).
  - `PATCH /api/v1/contracts/{id}` — Partial contract update (HR/Admin).
  - `POST /api/v1/contracts/{id}/activate` — Transition to `RUNNING` with overlap prevention.
  - `POST /api/v1/contracts/{id}/cancel` — Transition to `CANCELLED`.
- `employees.py` — Added `GET /api/v1/employees/{id}/contracts` for employee contract history.

#### Security & Test Stability
- `security.py` — Switched password hashing to direct `bcrypt` implementation, resolving Python 3.14 / bcrypt 5.0 passlib 72-byte probing bug.
- `pyproject.toml` & `conftest.py` — Configured session-scoped event loop and `NullPool` to ensure asyncpg connections remain cleanly isolated during test execution.

#### Database Migrations (`alembic/versions/`)
- `0003_create_contracts_table.py` — Migration creating `contractstatus` PostgreSQL enum and `contracts` table with indexes, foreign keys, and complete rollback support.

#### Tests (`tests/`)
- `test_contracts.py` — 18 comprehensive tests covering contract creation, smart defaults, wage & date validations, running contract overlap prevention, lifecycle transitions, employee history, and RBAC policies.

---

## [0.0.2] — 2026-09-05

### Summary
Phase 2 release — **Employee Master & HR Master Data**.
Establishes the core organizational master entities (`Role`, `Department`, `JobPosition`), the primary HR business entity (`Employee`), the 1:1 `User ↔ Employee` relationship, and role-based access control.

### Added

#### Database Models (`app/models/`)
- `role.py` — `Role` ORM model with `id`, `name` (unique), `description`, `is_active`, and timestamps.
- `department.py` — `Department` ORM model with `id`, `name` (unique), `code` (unique normalized), `description`, `is_active`, and timestamps.
- `job_position.py` — `JobPosition` ORM model with `id`, `name` (unique), `code` (unique normalized), `description`, `is_active`, and timestamps.
- `employee.py` — `EmployeeStatus` enum (`ACTIVE`, `INACTIVE`, `ON_LEAVE`, `TERMINATED`) and `Employee` ORM model with `employee_code`, `first_name`, `last_name`, `email`, `phone`, `date_of_birth`, `joining_date`, `department_id`, `job_position_id`, `manager_id` (self-referencing), `status`, and relationships.
- `user.py` — Modified `User` ORM model: replaced `role` enum with `role_id` foreign key referencing `roles.id`, replaced `emp_id` with `employee_id` unique foreign key referencing `employees.id`, added `Role` and `Employee` relationships.

#### Pydantic Schemas (`app/schemas/`)
- `role.py` — `RoleCreate`, `RoleUpdate`, `RoleResponse`.
- `department.py` — `DepartmentCreate`, `DepartmentUpdate`, `DepartmentResponse` with uppercase code normalization.
- `job_position.py` — `JobPositionCreate`, `JobPositionUpdate`, `JobPositionResponse` with uppercase code normalization.
- `employee.py` — `EmployeeCreate`, `EmployeeUpdate`, `EmployeeResponse` (with nested department, job position, and summary manager), `EmployeeListResponse`, `LinkUserRequest`.
- `user.py` — Updated `UserCreate` and `UserResponse` with `role_id`, `employee_id`, and backwards-compatible role name extraction.

#### Service Layer (`app/services/`)
- `role_service.py` — Role listing, retrieval, creation, updating, and idempotent seeding of the 5 standard system roles.
- `department_service.py` — Department CRUD with unique validation and safe deactivation guarding against active employee assignments.
- `job_position_service.py` — Job Position CRUD with unique validation and safe deactivation guarding against active employee assignments.
- `employee_service.py` — Employee CRUD, search, filter, pagination, self-manager prevention, and 1:1 user linking.
- `user_service.py` — Updated user creation with role resolution and employee link validation.

#### API Routers (`app/api/`)
- `roles.py` — `GET /api/v1/roles`, `GET /api/v1/roles/{role_id}`.
- `departments.py` — `GET /api/v1/departments`, `POST /api/v1/departments`, `GET /api/v1/departments/{id}`, `PATCH /api/v1/departments/{id}`, `DELETE /api/v1/departments/{id}`.
- `job_positions.py` — `GET /api/v1/job-positions`, `POST /api/v1/job-positions`, `GET /api/v1/job-positions/{id}`, `PATCH /api/v1/job-positions/{id}`, `DELETE /api/v1/job-positions/{id}`.
- `employees.py` — `POST /api/v1/employees`, `GET /api/v1/employees`, `GET /api/v1/employees/me`, `GET /api/v1/employees/{id}`, `PATCH /api/v1/employees/{id}`, `DELETE /api/v1/employees/{id}`, `POST /api/v1/employees/{id}/user`.

#### Reusable RBAC (`app/dependencies/auth.py`)
- Updated `require_role` to check against `current_user.role_name`.
- Added standard permission bundles: `require_hr_management()`, `require_master_data_admin()`, `require_admin()`.

#### Database Migrations (`alembic/versions/`)
- `0002_create_hr_master_and_employee_tables.py` — Complete migration creating roles, seeding standard roles, creating departments, job positions, employees, and migrating users table.

#### Tests (`tests/`)
- `test_master_data.py` — 18 tests for roles, departments, and job positions (CRUD, uniqueness, RBAC, deactivation).
- `test_employees.py` — 14 tests for employee CRUD, validations, manager hierarchy, user linking, self-service profile, and RBAC.

---

## [0.0.1] — 2026-09-05

### Summary
Initial release — **User & Authentication Foundation**.
Establishes the production-grade auth backbone that all future HR & Payroll modules will build upon.

### Added

#### Project Scaffolding
- `pyproject.toml` with project metadata (`name`, `version = "0.0.1"`, Python ≥ 3.12)
- `.env.example` documenting all required environment variables
- `.gitignore` covering Python, virtual environments, secrets, IDE, and OS artefacts

#### Core Configuration (`app/core/`)
- `config.py` — `Settings` class via `pydantic-settings`; reads `DATABASE_URL`, `SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `CORS_ORIGINS` from environment
- `security.py` — password hashing (`hash_password`, `verify_password` via `passlib[bcrypt]`) and JWT utilities (`create_access_token`, `create_refresh_token`, `decode_access_token`, `decode_refresh_token` via `python-jose[cryptography]`)

#### Database Layer (`app/db/`)
- `base.py` — SQLAlchemy 2.x `DeclarativeBase`; imports all models for Alembic `autogenerate`
- `database.py` — async engine, `AsyncSessionLocal` session factory, request-scoped `get_db()` dependency with auto-close and rollback on failure

#### User Model (`app/models/`)
- `user.py` — `UserRole` `StrEnum` (`EMPLOYEE`, `HR_MANAGER`, `HR_PAYROLL_USER`, `HR_PAYROLL_MANAGER`, `ADMIN`) and `User` ORM model with auto-incrementing Integer PK, nullable `emp_id` (FK-ready), unique indexed `email`, bcrypt `password_hash`, native PG ENUM role, `is_active`, timezone-aware `created_at`/`updated_at`

#### Pydantic Schemas (`app/schemas/`)
- `user.py` — `UserCreate` (with password strength validation), `UserResponse` (no password fields)
- `auth.py` — `LoginRequest`, `RefreshRequest`, `TokenResponse` (access + refresh tokens), `TokenPayload`

#### Services (`app/services/`)
- `user_service.py` — `get_user_by_email`, `get_user_by_id`, `create_user` (duplicate-email 409, hashes password)
- `auth_service.py` — `authenticate_user` (opaque 401 — never reveals email existence), `refresh_tokens`

#### Dependency Injection (`app/dependencies/`)
- `auth.py` — `get_current_user` dependency (decodes JWT, verifies DB existence and active status); `require_role(*roles)` dependency factory for endpoint RBAC

#### API Endpoints (`app/api/`)
- `POST /api/v1/auth/register` — user registration (201 Created)
- `POST /api/v1/auth/login` — authenticate and issue tokens (200 OK)
- `POST /api/v1/auth/refresh` — token refresh (200 OK)
- `GET /api/v1/auth/me` — retrieve authenticated user profile (200 OK)
- `GET /api/v1/health` — health check returning status and version (200 OK)

#### Entry Point (`app/main.py`)
- FastAPI application factory
- CORS middleware with origin whitelist from environment
- API routers mounted under `/api/v1`
- Global unhandled exception handler returning generic 500

#### Database Migrations (`alembic/`)
- Initialized async Alembic environment (`alembic/env.py`) reading `DATABASE_URL` dynamically from `Settings`
- First migration `0001_create_users_table.py` with `users` table, `userrole` ENUM, and email/emp_id indexes

#### Test Suite (`tests/`)
- `conftest.py` with session-scoped table creation, per-test transactional rollback isolation, and authenticated HTTP client fixtures
- `test_auth.py` with 15 test cases covering all registration, login, token refresh, and authorization flows

