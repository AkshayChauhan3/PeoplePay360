# PeoplePay360

> Production-oriented HR & Payroll Management System

## Project Structure

```
PeoplePay360/
├── .gitignore
├── README.md
├── docs/
│   └── imp_plans/          ← Architecture & implementation plans
└── backend/                ← FastAPI + PostgreSQL backend
    ├── .env.example
    ├── pyproject.toml      ← version, dependencies
    ├── CHANGELOG.md
    ├── alembic.ini
    ├── alembic/
    │   └── versions/       ← Database migrations
    ├── app/
    │   ├── main.py
    │   ├── core/           ← Config, security utilities
    │   ├── db/             ← SQLAlchemy engine & session
    │   ├── models/         ← ORM models
    │   ├── schemas/        ← Pydantic schemas
    │   ├── services/       ← Business logic
    │   ├── api/            ← Route handlers
    │   └── dependencies/   ← FastAPI dependency injection
    └── tests/
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI (async) |
| Database | PostgreSQL |
| ORM | SQLAlchemy 2.x |
| Validation | Pydantic v2 |
| Auth | JWT (HS256) via python-jose |
| Password hashing | bcrypt via passlib |
| Migrations | Alembic |
| Testing | pytest-asyncio + httpx |

## Versions

| Version | Description |
|---|---|
| [v0.0.1](backend/CHANGELOG.md) | User & Authentication Foundation |

## Quick Start

```bash
cd backend
cp .env.example .env        # fill DATABASE_URL and SECRET_KEY
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

API docs available at: `http://localhost:8000/docs`

## Running Tests

```bash
cd backend
pytest tests/ -v
```

