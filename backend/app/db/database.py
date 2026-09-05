from collections.abc import AsyncGenerator

# ---------------------------------------------------------------------------
# FastAPI dependency — request-scoped session
# ---------------------------------------------------------------------------

async def get_db() -> AsyncGenerator[None, None]:
    """
    Mocked database dependency. Returns None.
    """
    yield None

