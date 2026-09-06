from abc import ABC, abstractmethod


class BaseStorageService(ABC):
    """
    Abstract Base Class defining the storage contract for generated payslip PDFs.
    Implementations include LocalFileStorageService (for local development)
    and cloud backends such as S3 / GCS for production environments.
    """

    @abstractmethod
    async def save_payslip_pdf(self, key: str, pdf_bytes: bytes) -> str:
        """
        Store PDF bytes under the specified key/path.
        Returns the key / storage path.
        """
        pass

    @abstractmethod
    async def get_payslip_pdf(self, key: str) -> bytes | None:
        """
        Retrieve PDF bytes for the given storage key.
        Returns None if key is not found.
        """
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """
        Check if the file exists under the storage key.
        """
        pass

    @abstractmethod
    async def delete_payslip_pdf(self, key: str) -> bool:
        """
        Remove the stored file if it exists.
        """
        pass

