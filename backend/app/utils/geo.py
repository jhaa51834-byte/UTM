"""IP geolocation utility.

Uses MaxMind GeoLite2 database when available; falls back to a stub
that returns empty location data (the app works without GeoIP).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ..config import settings


@dataclass
class GeoResult:
    country: str = ""
    country_code: str = ""
    region: str = ""
    city: str = ""
    latitude: float = 0.0
    longitude: float = 0.0


_reader: Any | None = None
_available = False


def init_geoip() -> bool:
    """Initialize the GeoIP reader. Returns True if a DB was loaded."""
    global _reader, _available
    if not settings.geoip_db_path:
        return False
    try:
        import geoip2.database
        _reader = geoip2.database.Reader(settings.geoip_db_path)
        _available = True
        return True
    except Exception:
        _available = False
        return False


def close_geoip() -> None:
    global _reader, _available
    if _reader:
        _reader.close()
    _reader = None
    _available = False


def lookup(ip_address: str) -> GeoResult:
    """Look up geographic information for an IP address."""
    if not _available or not _reader:
        return GeoResult()

    try:
        # Skip private / loopback addresses
        import ipaddress
        addr = ipaddress.ip_address(ip_address)
        if addr.is_private or addr.is_loopback:
            return GeoResult()

        response = _reader.city(ip_address)
        return GeoResult(
            country=response.country.name or "",
            country_code=response.country.iso_code or "",
            region=response.subdivisions.most_specific.name or "" if response.subdivisions else "",
            city=response.city.name or "",
            latitude=response.location.latitude or 0.0,
            longitude=response.location.longitude or 0.0,
        )
    except Exception:
        return GeoResult()
