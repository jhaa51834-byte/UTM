"""UTM Builder API — FastAPI application entry point.

Run locally:
    uvicorn app.main:app --reload --port 8000
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, SessionLocal, engine
from .routers import bulk, governance, history, templates, tools, utm
from .services.governance import seed_default_rules

# Path to the built React frontend (populated in Docker)
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_default_rules(db)
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Enterprise UTM link builder: generation, validation, "
                "governance, templates, bulk CSV, QR codes and history.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api"
app.include_router(utm.router, prefix=API_PREFIX)
app.include_router(bulk.router, prefix=API_PREFIX)
app.include_router(templates.router, prefix=API_PREFIX)
app.include_router(history.router, prefix=API_PREFIX)
app.include_router(governance.router, prefix=API_PREFIX)
app.include_router(tools.router, prefix=API_PREFIX)


@app.get("/healthz")
def healthz():
    return {"status": "ok", "app": settings.app_name}


# Serve React frontend static files in production (Docker / HF Spaces)
if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA — falls back to index.html for client-side routing."""
        file_path = STATIC_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(STATIC_DIR / "index.html")
