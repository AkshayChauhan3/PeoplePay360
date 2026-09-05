from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Liveness check")
async def health() -> dict[str, str]:
    """Return a simple OK response to confirm the service is running."""
    return {"status": "ok", "version": settings.app_version}

