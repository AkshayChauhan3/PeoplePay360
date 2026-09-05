from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Liveness check")
async def health() -> dict[str, str]:
    """Return a simple OK response to confirm the service is running."""
    return {"status": "ok", "version": "0.0.1"}

