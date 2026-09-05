# PeoplePay360 — User & Authentication Foundation

A production-oriented FastAPI + PostgreSQL authentication backbone for the PeoplePay360 HR & Payroll system. This plan covers **only** the User + Auth layer. No business modules (Employee, Payroll, etc.) are in scope.

---

## Architecture Overview

### Request Flow

```
Client
  │
  ▼
FastAPI Router  (/auth/register, /auth/login, /auth/me)
  │
  ▼
Pydantic Schema (input validation)
  │
  ▼
Service Layer  (user_service / auth_service)
  │
  ▼
SQLAlchemy 2.x ORM  (async session)
  │
  ▼
PostgreSQL
```

### Authentication Flow (JWT)

```
Login Request
  │
  ├── Find user by email (user_service)
  ├── verify_password()              ← core/security.py
  ├── Check is_active
  ├── create_access_token()          ← core/security.py
  ├── create_refresh_token()         ← core/security.py
  └── Return TokenResponse (access_token + refresh_token)

Refresh Request  (POST /auth/refresh)
  │
  ├── Extract refresh token from request body
  ├── decode_refresh_token()         ← core/security.py
  ├── Validate token type == "refresh"
  ├── Load user from DB
  ├── Check is_active
  ├── Issue new access_token (+ optionally rotate refresh_token)
  └── Return TokenResponse

Protected Request
  │
  ├── Extract Bearer access token
  ├── decode_access_token()          ← core/security.py
  ├── Load user from DB              ← get_current_user() dependency
  ├── Check is_active
  └── Inject CurrentUser into route
```

### Database Design

| Column        | Type          | Constraints                           |
|---------------|---------------|---------------------------------------|
| `id`          | UUID          | PK, default uuid_generate_v4()        |
| `emp_id`      | UUID          | Nullable (FK-ready for Employee later)|
| `email`       | VARCHAR(255)  | UNIQUE, NOT NULL, indexed             |
| `password_hash` | VARCHAR(255)| NOT NULL                              |
| `role`        | ENUM(UserRole)| NOT NULL, default EMPLOYEE            |
| `is_active`   | BOOLEAN       | NOT NULL, default TRUE                |
| `created_at`  | TIMESTAMPTZ   | NOT NULL, server_default=now()        |
| `updated_at`  | TIMESTAMPTZ   | NOT NULL, onupdate=now()              |

**Key design decisions:**
- `emp_id` is intentionally nullable with no FK constraint yet — adding the FK later via Alembic migration is trivial and won't require touching the auth module
- UUID primary key avoids sequential ID enumeration attacks
- `role` stored as PostgreSQL native ENUM via SQLAlchemy Enum type — type-safe and validated at DB level
- `password_hash` excluded from all Pydantic response schemas by design
- Composite index on `(email, is_active)` for frequent login queries

### Security Decisions

| Decision | Rationale |
|----------|-----------|
| `passlib[bcrypt]` for hashing | Industry-standard, battle-tested, adaptive cost factor |
| JWT via `python-jose[cryptography]` | Widely used, supports RS256/HS256, actively maintained |
| HS256 with env-variable secret | Sufficient for single-service auth; RS256 upgrade path documented |
| Opaque login error messages | Never reveal whether email exists; always return generic 401 |
| Access JWT contains only `sub`, `type`, `exp` | Minimal claims — no PII, no roles in token |
| Refresh token as long-lived JWT (`type=refresh`) | Stateless refresh — no Redis/DB table needed; short access token + longer refresh token |
| Refresh token rotation | Each refresh issues a new refresh token, invalidating the old one conceptually (stateless rotation) |
| `REFRESH_TOKEN_EXPIRE_DAYS` env var | Configurable refresh TTL, default 7 days |
| Roles loaded from DB on each request | Role changes take effect immediately; no stale token issue |
| CORS from environment config | No allow-all wildcard in production |

---

## Resolved Decisions

| Decision | Resolution |
|---|---|
| **Token Refresh** | ✅ Refresh tokens **included in this phase** — see details below |
| **JWT Algorithm** | ✅ **HS256** confirmed — symmetric, single secret, suitable for monolith |
| **Test database** | ✅ **Single PostgreSQL database** — same `DATABASE_URL`, isolated via per-test transaction rollbacks |

> [!NOTE]
> **UUID generation** — PostgreSQL's `uuid-ossp` extension (`gen_random_uuid()` in pg 13+) will be used. No application-side UUID generation dependency needed if running PG 13+. Alembic migration will handle enabling the extension.

---

## Proposed Changes

### Project Root

#### [NEW] `.env.example`
Environment variable template (never committed with real values).

#### [NEW] `.gitignore`
Standard Python + secrets gitignore.

#### [NEW] `pyproject.toml` (or `requirements.txt`)
Dependencies:
- `fastapi`, `uvicorn[standard]`
- `sqlalchemy[asyncio]`, `asyncpg`
- `alembic`
- `pydantic[email]`, `pydantic-settings`
- `passlib[bcrypt]`
- `python-jose[cryptography]`
- `pytest`, `pytest-asyncio`, `httpx`

---

### Core Configuration

#### [NEW] [`app/core/config.py`](file:///home/akshaychauhan/Playground/PeoplePay360/app/core/config.py)
`Settings` class using `pydantic-settings` with `BaseSettings`.  
Reads from environment variables:
- `DATABASE_URL`
- `SECRET_KEY`
- `JWT_ALGORITHM` (default `HS256`)
- `ACCESS_TOKEN_EXPIRE_MINUTES` (default `30`)
- `REFRESH_TOKEN_EXPIRE_DAYS` (default `7`)
- `CORS_ORIGINS` (comma-separated list)

#### [NEW] [`app/core/security.py`](file:///home/akshaychauhan/Playground/PeoplePay360/app/core/security.py)
Password hashing and JWT utilities:
- `hash_password(plain: str) -> str`
- `verify_password(plain: str, hashed: str) -> bool`
- `create_access_token(subject: str) -> str` — short-lived (minutes)
- `create_refresh_token(subject: str) -> str` — long-lived (days), `type=refresh` claim
- `decode_access_token(token: str) -> TokenPayload`
- `decode_refresh_token(token: str) -> TokenPayload` — validates `type == "refresh"`

---

### Database Layer

#### [NEW] [`app/db/database.py`](file:///home/akshaychauhan/Playground/PeoplePay360/app/db/database.py)
- Async SQLAlchemy engine (`create_async_engine`)
- `AsyncSessionLocal` session factory
- `get_db()` async generator dependency (request-scoped, auto-close, rollback on error)

#### [NEW] [`app/db/base.py`](file:///home/akshaychauhan/Playground/PeoplePay360/app/db/base.py)
- `DeclarativeBase` subclass — single source of truth for Alembic `autogenerate`
- Imports all models so Alembic can discover them

---

### Models

#### [NEW] [`app/models/user.py`](file:///home/akshaychauhan/Playground/PeoplePay360/app/models/user.py)
- `UserRole` Python `StrEnum` + mapped SQLAlchemy `Enum`
- `User` ORM model with all columns, indexes, and constraints as designed above
- `__tablename__ = "users"`
- `emp_id` nullable UUID — no FK constraint until Employee module lands

---

### Schemas

#### [NEW] [`app/schemas/user.py`](file:///home/akshaychauhan/Playground/PeoplePay360/app/schemas/user.py)
- `UserCreate` — email, password (min 8 chars, validated), role, optional emp_id
- `UserResponse` — id, emp_id, email, role, is_active, created_at, updated_at  
  (`model_config = ConfigDict(from_attributes=True)`)

#### [NEW] [`app/schemas/auth.py`](file:///home/akshaychauhan/Playground/PeoplePay360/app/schemas/auth.py)
- `LoginRequest` — email, password
- `RefreshRequest` — refresh_token (string)
- `TokenResponse` — access_token, refresh_token, token_type
- `TokenPayload` — sub, type, exp (internal use only, not an API response schema)

---

### Services

#### [NEW] [`app/services/user_service.py`](file:///home/akshaychauhan/Playground/PeoplePay360/app/services/user_service.py)
- `get_user_by_email(db, email) -> User | None`
- `get_user_by_id(db, user_id) -> User | None`
- `create_user(db, data: UserCreate) -> User`
  - checks for duplicate email (409 on conflict)
  - hashes password via `security.hash_password()`
  - commits and refreshes

#### [NEW] [`app/services/auth_service.py`](file:///home/akshaychauhan/Playground/PeoplePay360/app/services/auth_service.py)
- `authenticate_user(db, email, password) -> User`
  - calls `get_user_by_email`
  - calls `security.verify_password`
  - checks `is_active`
  - raises generic 401 on any failure (no email-existence leak)

---

### Dependencies

#### [NEW] [`app/dependencies/auth.py`](file:///home/akshaychauhan/Playground/PeoplePay360/app/dependencies/auth.py)
Reusable FastAPI dependency callables:
- `get_current_user(token, db) -> User` — decodes JWT, loads user from DB, checks is_active
- `require_role(*roles: UserRole)` — returns a dependency factory; raises 403 if user's role is not in the allowed set

Usage pattern:
```python
# Simple auth
async def endpoint(user=Depends(get_current_user)): ...

# Role-gated
async def endpoint(user=Depends(require_role(UserRole.ADMIN, UserRole.HR_MANAGER))): ...
```

---

### API Routers

#### [NEW] [`app/api/auth.py`](file:///home/akshaychauhan/Playground/PeoplePay360/app/api/auth.py)
- `POST /auth/register` → `UserResponse` (201)
- `POST /auth/login` → `TokenResponse` (200) — returns access_token + refresh_token
- `POST /auth/refresh` → `TokenResponse` (200) — accepts refresh_token, returns new access_token + rotated refresh_token
- `GET /auth/me` → `UserResponse` (200) — requires `get_current_user` dependency

#### [NEW] [`app/api/health.py`](file:///home/akshaychauhan/Playground/PeoplePay360/app/api/health.py)
- `GET /health` → `{"status": "ok"}` (200)

---

### Application Entry Point

#### [NEW] [`app/main.py`](file:///home/akshaychauhan/Playground/PeoplePay360/app/main.py)
- Creates `FastAPI` app instance with metadata
- Registers CORS middleware (origins from `settings.CORS_ORIGINS`)
- Includes routers with `/api/v1` prefix
- Global exception handlers for clean error responses

---

### Migrations (Alembic)

#### [NEW] `alembic/` directory
- `alembic.ini` — points `sqlalchemy.url` to env var `%(DATABASE_URL)s`
- `alembic/env.py` — imports `Base` metadata for autogenerate; uses async engine setup
- `alembic/versions/0001_create_users_table.py` — first migration:
  - enables `uuid-ossp` PG extension
  - creates `userrole` ENUM type
  - creates `users` table with all constraints and indexes

---

### Tests

#### [NEW] `tests/conftest.py`
- Uses same `DATABASE_URL` from environment (single database, no separate test DB)
- **Isolation strategy**: each test wraps its work in a transaction that is rolled back after the test completes — no leftover data between tests
- `async_client` fixture using `httpx.AsyncClient` with `ASGITransport`
- `db_session` fixture provides the transactional session for direct DB assertions
- Schema is created once at session start via `Base.metadata.create_all`

#### [NEW] `tests/test_auth.py`
15 test cases covering all required scenarios:

| # | Test |
|---|------|
| 1 | Registration succeeds → 201, returns UserResponse |
| 2 | Duplicate email → 409 Conflict |
| 3 | Password stored as bcrypt hash, not plaintext |
| 4 | `password_hash` never in API response |
| 5 | Login with correct credentials → 200, returns access_token + refresh_token |
| 6 | Login with wrong password → 401 |
| 7 | Inactive user cannot login → 403 |
| 8 | Valid JWT on `/auth/me` → 200, user data returned |
| 9 | Invalid JWT → 401 |
| 10 | Expired JWT → 401 |
| 11 | Invalid role in registration → 422 |
| 12 | Unauthenticated request to protected endpoint → 401 |
| 13 | Valid refresh token → 200, returns new access_token + new refresh_token |
| 14 | Invalid refresh token → 401 |
| 15 | Expired refresh token → 401 |

---

## Final Folder Structure

```
PeoplePay360/
├── .env.example
├── .gitignore
├── pyproject.toml
├── alembic.ini
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 0001_create_users_table.py
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   └── security.py
│   ├── db/
│   │   ├── database.py
│   │   └── base.py
│   ├── models/
│   │   └── user.py
│   ├── schemas/
│   │   ├── user.py
│   │   └── auth.py
│   ├── services/
│   │   ├── user_service.py
│   │   └── auth_service.py
│   ├── api/
│   │   ├── auth.py
│   │   └── health.py
│   └── dependencies/
│       └── auth.py
└── tests/
    ├── conftest.py
    └── test_auth.py
```

---

## Verification Plan

### Automated Tests
```bash
pytest tests/ -v --asyncio-mode=auto
```

### Manual Verification
```bash
# 1. Apply migration
alembic upgrade head

# 2. Start server
uvicorn app.main:app --reload

# 3. Open interactive docs
open http://localhost:8000/docs
```

**Example HTTP flows to verify manually:**

**Register:**
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "admin@peoplepay360.com",
  "password": "Str0ng!Pass",
  "role": "ADMIN"
}
```

**Login:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@peoplepay360.com",
  "password": "Str0ng!Pass"
}
```
Response:
```json
{
  "access_token": "<short-lived-jwt>",
  "refresh_token": "<long-lived-jwt>",
  "token_type": "bearer"
}
```

**Refresh:**
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "<long-lived-jwt>"
}
```

**Me (authenticated):**
```http
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```
