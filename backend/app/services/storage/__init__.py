from app.core.config import settings
from app.services.storage.base import BaseStorageService
from app.services.storage.local_storage import LocalFileStorageService

_storage_instance: BaseStorageService | None = None


def get_storage_service() -> BaseStorageService:
    """Returns the singleton or configured storage service instance."""
    global _storage_instance
    if _storage_instance is None:
        if settings.storage_backend.lower() == "local":
            _storage_instance = LocalFileStorageService()
        else:
            # Fallback to local
            _storage_instance = LocalFileStorageService()
    return _storage_instance

