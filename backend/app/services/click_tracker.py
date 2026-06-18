"""Click tracking pipeline.

Records click events to ClickHouse and updates Redis counters.
Parses user agent, looks up geolocation, and detects bots.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from urllib.parse import urlsplit

from ..utils.geo import lookup as geo_lookup
from ..utils.hashing import hash_ip
from ..utils.ua_parser import parse_user_agent


def build_click_event(
    link_id: uuid.UUID,
    org_id: uuid.UUID,
    short_code: str,
    ip_address: str,
    user_agent: str,
    referrer: str = "",
    utm_source: str = "",
    utm_medium: str = "",
    utm_campaign: str = "",
    utm_content: str = "",
    utm_term: str = "",
    is_qr_scan: bool = False,
    language: str = "",
    variant_id: str = "",
    rule_id: str = "",
) -> dict:
    """Build a click event dict ready for ClickHouse insertion."""
    now = datetime.now(timezone.utc)
    ua = parse_user_agent(user_agent)
    geo = geo_lookup(ip_address)

    # Extract referrer domain
    referrer_domain = ""
    if referrer:
        try:
            referrer_domain = urlsplit(referrer).netloc.lower()
        except Exception:
            pass

    return {
        "link_id": str(link_id),
        "org_id": str(org_id),
        "short_code": short_code,
        "clicked_at": now.isoformat(),
        "country": geo.country,
        "country_code": geo.country_code,
        "region": geo.region,
        "city": geo.city,
        "latitude": geo.latitude,
        "longitude": geo.longitude,
        "device_type": ua.device_type,
        "browser": ua.browser,
        "browser_version": ua.browser_version,
        "os": ua.os,
        "os_version": ua.os_version,
        "referrer": referrer[:2048],
        "referrer_domain": referrer_domain,
        "user_agent": user_agent[:1024],
        "ip_hash": hash_ip(ip_address, "trackflow"),
        "utm_source": utm_source,
        "utm_medium": utm_medium,
        "utm_campaign": utm_campaign,
        "utm_content": utm_content,
        "utm_term": utm_term,
        "language": language,
        "is_unique": 1,  # TODO: check Redis for uniqueness within time window
        "is_bot": 1 if ua.is_bot else 0,
        "is_qr_scan": 1 if is_qr_scan else 0,
        "variant_id": variant_id,
        "rule_id": rule_id,
    }


async def record_click(event: dict) -> None:
    """Record a click event to ClickHouse.

    In production this should be batched via a queue (Celery/Redis stream).
    For now, we insert directly.
    """
    try:
        from ..clickhouse import insert_clicks
        insert_clicks([event])
    except Exception:
        # Fail silently — click tracking should never break redirects
        pass


async def record_click_redis(
    link_id: str,
    org_id: str,
) -> None:
    """Update Redis counters for real-time dashboards."""
    try:
        from ..redis import get_redis
        r = get_redis()
        pipe = r.pipeline()
        now = datetime.now(timezone.utc)
        hour_key = now.strftime("%Y%m%d%H")

        # Per-link counter
        pipe.incr(f"clicks:{link_id}:total")
        pipe.incr(f"clicks:{link_id}:{hour_key}")
        pipe.expire(f"clicks:{link_id}:{hour_key}", 86400 * 7)

        # Org-level counter
        pipe.incr(f"org_clicks:{org_id}:total")
        pipe.incr(f"org_clicks:{org_id}:{hour_key}")
        pipe.expire(f"org_clicks:{org_id}:{hour_key}", 86400 * 7)

        # Global real-time counter (last 60 seconds)
        pipe.incr(f"realtime:{org_id}")
        pipe.expire(f"realtime:{org_id}", 60)

        await pipe.execute()
    except Exception:
        pass
