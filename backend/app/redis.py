"""Redis connection pool and helpers.

Used for: session cache, rate limiting, link resolution cache, Celery broker.
"""
from __future__ import annotations

import json
from typing import Any

import redis.asyncio as aioredis

from .config import settings

_pool: aioredis.ConnectionPool | None = None
_client: aioredis.Redis | None = None


async def init_redis() -> aioredis.Redis:
    """Initialize the Redis connection pool. Called once at startup."""
    global _pool, _client
    _pool = aioredis.ConnectionPool.from_url(
        settings.redis_url,
        max_connections=50,
        decode_responses=True,
    )
    _client = aioredis.Redis(connection_pool=_pool)
    return _client


async def close_redis() -> None:
    """Shutdown the Redis pool. Called at app shutdown."""
    global _client, _pool
    if _client:
        await _client.aclose()
    if _pool:
        await _pool.disconnect()
    _client = None
    _pool = None


def get_redis() -> aioredis.Redis:
    """Return the global Redis client. Raises if not initialised."""
    if _client is None:
        raise RuntimeError("Redis not initialised — call init_redis() first.")
    return _client


# ── Cache helpers ────────────────────────────────────────────────

async def cache_get(key: str) -> Any | None:
    """Get a JSON-decoded value from cache."""
    r = get_redis()
    raw = await r.get(key)
    if raw is None:
        return None
    return json.loads(raw)


async def cache_set(key: str, value: Any, ttl: int | None = None) -> None:
    """Set a JSON-encoded value in cache with optional TTL in seconds."""
    r = get_redis()
    ttl = ttl or settings.redis_cache_ttl
    await r.set(key, json.dumps(value, default=str), ex=ttl)


async def cache_delete(key: str) -> None:
    """Delete a key from cache."""
    r = get_redis()
    await r.delete(key)


async def cache_delete_pattern(pattern: str) -> None:
    """Delete all keys matching a pattern."""
    r = get_redis()
    cursor = 0
    while True:
        cursor, keys = await r.scan(cursor, match=pattern, count=100)
        if keys:
            await r.delete(*keys)
        if cursor == 0:
            break
