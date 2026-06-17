"""TrackFlow application configuration.

All settings can be overridden with environment variables or a .env file.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Application ──────────────────────────────────────────────
    app_name: str = "TrackFlow"
    app_version: str = "2.0.0"
    debug: bool = False
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    api_prefix: str = "/api/v1"

    # ── Database (PostgreSQL) ────────────────────────────────────
    database_url: str = "postgresql+asyncpg://trackflow:trackflow@localhost:5432/trackflow"
    db_pool_size: int = 20
    db_max_overflow: int = 10
    db_echo: bool = False

    # ── Redis ────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    redis_cache_ttl: int = 3600  # seconds

    # ── ClickHouse ───────────────────────────────────────────────
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_user: str = "default"
    clickhouse_password: str = ""
    clickhouse_database: str = "trackflow"

    # ── JWT ───────────────────────────────────────────────────────
    jwt_secret: str = "change-me-jwt-secret-use-openssl-rand-hex-64"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expires_minutes: int = 30
    jwt_refresh_token_expires_days: int = 30

    # ── OAuth2 ───────────────────────────────────────────────────
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/oauth/google/callback"

    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    microsoft_redirect_uri: str = "http://localhost:8000/api/v1/auth/oauth/microsoft/callback"

    # ── CORS ─────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # ── AI Providers ─────────────────────────────────────────────
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-haiku-4-5-20251001"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # ── Celery ───────────────────────────────────────────────────
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # ── Link Shortener ───────────────────────────────────────────
    default_short_domain: str = "localhost:8000"
    short_code_length: int = 7
    max_url_length: int = 2048

    # ── Rate Limiting ────────────────────────────────────────────
    rate_limit_per_minute: int = 60
    rate_limit_burst: int = 10

    # ── GeoIP ────────────────────────────────────────────────────
    geoip_db_path: str = ""  # Path to MaxMind GeoLite2 .mmdb file

    # ── External Integrations ────────────────────────────────────
    bitly_token: str = ""

    # ── Email (future) ───────────────────────────────────────────
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@trackflow.io"


settings = Settings()
