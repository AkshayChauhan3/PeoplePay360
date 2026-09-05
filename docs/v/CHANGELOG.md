# Changelog

All notable changes to **PeoplePay360** are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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
- `user.py` — `UserRole` `StrEnum` (`EMPLOYEE`, `HR_MANAGER`, `HR_PAYROLL_USER`, `HR_PAYROLL_MANAGER`, `ADMIN`) and `User` ORM model with UUID PK, nullable `emp_id` (FK-ready), unique indexed `email`, bcrypt `password_hash`, native PG ENUM role, `is_active`, timezone-aware `created_at`/`updated_at`

#### Pydantic Schemas (`app/schemas/`)
- `user.py` — `UserCreate` (with password strength validation), `UserResponse` (no password fields)
- `auth.py` — `LoginRequest`, `RefreshRequest`, `TokenResponse` (access + refresh tokens), `TokenPayload`

#### Services (`app/services/`)
- `user_service.py` — `get_user_by_email`, `get_user_by_id`, `create_user` (duplicate-email 409, hashes password)
- `auth_service.py` — `authenticate_user` (opaque 401 — never reveals email existence), `refresh_tokens`

#### FastAPI Dependencies (`app/dependencies/`)
- `auth.py` — `get_current_user` (JWT decode → DB load → active check), `require_role(*roles)` dependency factory for future RBAC

#### API Endpoints (`app/api/`)
- `POST /api/v1/auth/register` — create user, returns `UserResponse` (201)
- `POST /api/v1/auth/login` — verify credentials, returns `TokenResponse` with access + refresh tokens (200)
- `POST /api/v1/auth/refresh` — issue new token pair from valid refresh token (200)
- `GET  /api/v1/auth/me` — return current authenticated user (200)
- `GET  /api/v1/health` — liveness check (200)

#### Database Migrations (Alembic)
- `alembic.ini` + async `alembic/env.py` configured with `Base` metadata
- `0001_create_users_table.py` — enables `uuid-ossp` extension, creates `userrole` ENUM, creates `users` table with all constraints and indexes

#### Tests (`tests/`)
- `conftest.py` — single `DATABASE_URL`, per-test transaction rollback isolation, `async_client` and `db_session` fixtures
- `test_auth.py` — 15 test cases covering registration, duplicate email, password hashing, login, inactive user, JWT (valid / invalid / expired), refresh token (valid / invalid / expired), role validation, unauthenticated access

### Security
- Passwords stored as bcrypt hashes — never plaintext, never returned in responses
- JWT access tokens (HS256, short-lived) + refresh tokens (long-lived, `type=refresh` claim)
- Opaque login errors — no email-existence leakage
- CORS origins configurable via environment — no allow-all wildcard
- Secrets exclusively in environment variables — not in source code

### Not Implemented (Future Phases)
- Employee, Contracts, Attendance, Payroll, Payslips, Time Off, Salary Rules modules
- Full RBAC permission matrix (foundations in place via `require_role`)
- Refresh token revocation / blacklist (requires Redis or DB table — planned for a later phase)

---

[Unreleased]: https://github.com/your-org/peoplepay360/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/your-org/peoplepay360/releases/tag/v0.0.1

