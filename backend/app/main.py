"""UTM Builder API — FastAPI application entry point.

Run locally:
    uvicorn app.main:app --reload --port 8000
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import Base, SessionLocal, engine
from .routers import bulk, governance, history, templates, tools, utm
from .services.governance import seed_default_rules


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
