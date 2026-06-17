"""Database session dependency for FastAPI."""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session as SyncSession

from ..config import settings
from ..database import AsyncSessionLocal, SyncSessionLocal

_is_sqlite = settings.database_url.startswith("sqlite")


async def get_db():
    """Yield a database session. Async for PostgreSQL, sync for SQLite."""
    if _is_sqlite:
        db = SyncSessionLocal()
        try:
            yield db
        finally:
            db.close()
    else:
        async with AsyncSessionLocal() as session:
            try:
                yield session
            finally:
                await session.close()


# Type alias for dependency injection
DBSession = AsyncSession | SyncSession
