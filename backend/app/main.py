"""TrackFlow API — FastAPI application entry point.

Run locally:
    uvicorn app.main:app --reload --port 8000
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .middleware.security import (
    RateLimitMiddleware,
    RequestTimingMiddleware,
    SecurityHeadersMiddleware,
)

logger = logging.getLogger("trackflow")

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    logger.info("TrackFlow starting up...")

    # ── Database ─────────────────────────────────────────────
    _is_sqlite = settings.database_url.startswith("sqlite")
    if _is_sqlite:
        from .database import Base, engine
        Base.metadata.create_all(bind=engine)
        logger.info("SQLite tables created (dev mode).")
    else:
        from .database import Base, async_engine
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("PostgreSQL tables created.")

    # ── Redis ────────────────────────────────────────────────
    try:
        from .redis import init_redis
        await init_redis()
        logger.info("Redis connected.")
    except Exception as e:
        logger.warning(f"Redis not available: {e}")

    # ── ClickHouse ───────────────────────────────────────────
    try:
        from .clickhouse import init_clickhouse
        init_clickhouse()
        logger.info("ClickHouse connected, schema ensured.")
    except Exception as e:
        logger.warning(f"ClickHouse not available: {e}")

    # ── GeoIP ────────────────────────────────────────────────
    try:
        from .utils.geo import init_geoip
        if init_geoip():
            logger.info("GeoIP database loaded.")
    except Exception:
        pass

    yield

    # ── Shutdown ─────────────────────────────────────────────
    try:
        from .redis import close_redis
        await close_redis()
    except Exception:
        pass
    try:
        from .clickhouse import close_clickhouse
        close_clickhouse()
    except Exception:
        pass
    try:
        from .utils.geo import close_geoip
        close_geoip()
    except Exception:
        pass

    logger.info("TrackFlow shut down.")


# ── Import all models so SQLAlchemy knows about them ─────────────
import app.models  # noqa: F401, E402

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Enterprise URL management platform: UTM generation, link shortening, "
        "QR codes, click analytics, campaign governance, and team collaboration. "
        "GA4 / Adobe Analytics / Tealium friendly."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware Stack (order matters: outermost runs first) ───────
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestTimingMiddleware)
app.add_middleware(
    RateLimitMiddleware,
    requests_per_minute=settings.rate_limit_per_minute,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routes ───────────────────────────────────────────────────
API = settings.api_prefix

from .routers import (  # noqa: E402
    admin, analytics, auth, bulk, campaigns, domains, governance,
    history, links, organizations, qr, redirect, templates, tools, utm,
)

# Auth (no prefix — under /api/v1/auth)
app.include_router(auth.router, prefix=API)

# Core resources
app.include_router(links.router, prefix=API)
app.include_router(utm.router, prefix=API)
app.include_router(campaigns.router, prefix=API)
app.include_router(domains.router, prefix=API)
app.include_router(qr.router, prefix=API)
app.include_router(analytics.router, prefix=API)
app.include_router(organizations.router, prefix=API)

# Existing ported routes
app.include_router(templates.router, prefix=API)
app.include_router(governance.router, prefix=API)
app.include_router(history.router, prefix=API)
app.include_router(bulk.router, prefix=API)
app.include_router(tools.router, prefix=API)

# Admin
app.include_router(admin.router, prefix=API)

# Short URL redirect (at root level)
app.include_router(redirect.router)


# ── Health Check ─────────────────────────────────────────────────
@app.get("/healthz", tags=["health"])
def healthz():
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
    }


# ── Serve React SPA (production) ────────────────────────────────
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA — falls back to index.html for client-side routing."""
        file_path = STATIC_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
