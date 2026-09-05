from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ROOT_DIR = _BACKEND_DIR.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=(
            ".env",
            str(_BACKEND_DIR / ".env"),
            str(_ROOT_DIR / ".env"),
        ),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Database
    database_url: str

    # JWT
    secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # CORS — comma-separated origins, e.g. "http://localhost:3000,https://app.example.com"
    cors_origins: str = "http://localhost:3000"

    # SMTP / Email Delivery
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "payroll@peoplepay360.com"
    smtp_from_name: str = "PeoplePay360 Payroll"
    smtp_use_tls: bool = True
    smtp_mock_delivery: bool = True
    company_name: str = "PeoplePay360 Technologies Pvt Ltd"

    # Application
    app_env: str = "development"
    app_version: str = "0.0.9"

    @property
    def is_smtp_configured(self) -> bool:
        """Returns True if live SMTP host is specified and mock delivery is disabled."""
        return bool(self.smtp_host.strip()) and not self.smtp_mock_delivery

    @property
    def cors_origins_list(self) -> list[str]:

        """Parse CORS_ORIGINS string into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (loaded once at startup)."""
    return Settings()


settings: Settings = get_settings()
