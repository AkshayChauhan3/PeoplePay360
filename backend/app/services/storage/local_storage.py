import asyncio
from pathlib import Path

from app.core.config import settings
from app.services.storage.base import BaseStorageService


class LocalFileStorageService(BaseStorageService):
    """
    Local filesystem storage implementation for payslip PDF files.
    Suitable for local development and single-node instances.
    """

    def __init__(self, base_dir: str | Path | None = None) -> None:
        if base_dir:
            self.base_dir = Path(base_dir).resolve()
        else:
            # Default to settings.storage_local_dir relative to backend root
            backend_root = Path(__file__).resolve().parent.parent.parent.parent
            self.base_dir = (backend_root / settings.storage_local_dir).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_path(self, key: str) -> Path:
        # Strip leading slashes to prevent escaping root
        clean_key = key.lstrip("/\\")
        target_path = (self.base_dir / clean_key).resolve()
        # Ensure target is within base_dir (path traversal guard)
        if not str(target_path).startswith(str(self.base_dir)):
            raise ValueError(f"Invalid storage key path traversal: {key}")
        return target_path

    async def save_payslip_pdf(self, key: str, pdf_bytes: bytes) -> str:
        target_path = self._resolve_path(key)

        def _sync_write() -> None:
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_bytes(pdf_bytes)

        await asyncio.to_thread(_sync_write)
        return str(key)

    async def get_payslip_pdf(self, key: str) -> bytes | None:
        target_path = self._resolve_path(key)

        def _sync_read() -> bytes | None:
            if not target_path.exists() or not target_path.is_file():
                return None
            return target_path.read_bytes()

        return await asyncio.to_thread(_sync_read)

    async def exists(self, key: str) -> bool:
        target_path = self._resolve_path(key)
        return await asyncio.to_thread(lambda: target_path.exists() and target_path.is_file())

    async def delete_payslip_pdf(self, key: str) -> bool:
        target_path = self._resolve_path(key)

        def _sync_delete() -> bool:
            if target_path.exists() and target_path.is_file():
                target_path.unlink()
                return True
            return False

        return await asyncio.to_thread(_sync_delete)

