"""Async SQLAlchemy engine and session factory for PostgreSQL.

Falls back to SQLite (sync) for local development when DATABASE_URL starts
with 'sqlite'. Production must use PostgreSQL with asyncpg.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

_is_sqlite = settings.database_url.startswith("sqlite")

if _is_sqlite:
    # ── SQLite sync fallback (dev only) ──────────────────────────
    _sync_url = settings.database_url
    engine = create_engine(_sync_url, connect_args={"check_same_thread": False}, pool_pre_ping=True)
    SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    async_engine = None
    AsyncSessionLocal = None
else:
    # ── PostgreSQL async (production) ────────────────────────────
    async_engine = create_async_engine(
        settings.database_url,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        echo=settings.db_echo,
        pool_pre_ping=True,
    )
    AsyncSessionLocal = async_sessionmaker(
        async_engine, class_=AsyncSession, expire_on_commit=False,
    )
    engine = None
    SyncSessionLocal = None


class Base(DeclarativeBase):
    pass


def get_db():
    """Yield a database session (sync for SQLite, async for PG).

    Used by legacy routers that import get_db from this module.
    New routers should use deps.database.get_db instead.
    """
    if _is_sqlite:
        db = SyncSessionLocal()
        try:
            yield db
        finally:
            db.close()
    else:
        # For sync routers, create a sync engine as fallback
        from sqlalchemy import create_engine as _ce
        from sqlalchemy.orm import sessionmaker as _sm
        sync_url = settings.database_url.replace("+asyncpg", "").replace("+aiopg", "")
        _engine = _ce(sync_url, pool_pre_ping=True)
        _Session = _sm(autocommit=False, autoflush=False, bind=_engine)
        db = _Session()
        try:
            yield db
        finally:
            db.close()


# Backward compatibility alias for tests
SessionLocal = SyncSessionLocal


