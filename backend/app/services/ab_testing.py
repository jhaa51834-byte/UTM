"""A/B testing engine: weighted (optionally sticky) variant selection and
per-variant result aggregation from ClickHouse.
"""
from __future__ import annotations

import hashlib
import random
import uuid
from typing import Any

_STICKY_BUCKETS = 100_000  # resolution of the deterministic hash bucket


def _sticky_point(seed: str, total: float) -> float:
    """Map a seed deterministically into [0, total)."""
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    bucket = int(digest, 16) % _STICKY_BUCKETS
    return (bucket / _STICKY_BUCKETS) * total


def pick_variant(variants: list[Any], seed: str | None = None) -> Any | None:
    """Choose a variant by weight.

    With ``seed`` the choice is deterministic (sticky per visitor); without it
    the choice is random. Variants with weight 0 are never chosen unless every
    weight is 0, in which case selection is uniform.
    """
    if not variants:
        return None
    if len(variants) == 1:
        return variants[0]

    weights = [max(0, int(getattr(v, "weight", 0))) for v in variants]
    total = sum(weights)

    if total <= 0:
        # No weights set — fall back to uniform.
        if seed is not None:
            idx = int(hashlib.sha256(seed.encode()).hexdigest(), 16) % len(variants)
            return variants[idx]
        return random.choice(variants)

    point = _sticky_point(seed, total) if seed is not None else random.uniform(0, total)
    cumulative = 0.0
    for variant, weight in zip(variants, weights):
        cumulative += weight
        if point < cumulative:
            return variant
    return variants[-1]  # floating-point safety net


def variant_click_counts(org_id: uuid.UUID, link_id: uuid.UUID) -> dict[str, dict[str, int]]:
    """Per-variant click counts from ClickHouse.

    Returns ``{variant_id: {"total": n, "unique": n}}``. On any failure
    (ClickHouse unavailable in dev/test) returns an empty dict so callers can
    degrade gracefully to zeros.
    """
    try:
        from ..clickhouse import query
        rows = query(
            """
            SELECT variant_id,
                   count() AS total,
                   sumIf(1, is_unique = 1) AS unique
            FROM clicks
            WHERE org_id = %(org_id)s
              AND link_id = %(link_id)s
              AND variant_id != ''
            GROUP BY variant_id
            """,
            {"org_id": str(org_id), "link_id": str(link_id)},
        )
        return {
            str(r["variant_id"]): {"total": int(r["total"]), "unique": int(r["unique"])}
            for r in rows
        }
    except Exception:
        return {}
