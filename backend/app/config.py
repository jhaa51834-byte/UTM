"""Application configuration.

All settings can be overridden with environment variables (or a .env file).
For production, point DATABASE_URL at PostgreSQL, e.g.:
    DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/utm_builder
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "UTM Builder"
    database_url: str = "sqlite:///./utm_builder.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Optional integrations
    bitly_token: str = ""
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-haiku-4-5-20251001"

    # Governance
    max_url_length: int = 2048


settings = Settings()
