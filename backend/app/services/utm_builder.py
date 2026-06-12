"""Core UTM URL construction.

Handles the awkward edge cases: existing query strings, pre-existing UTM
parameters, duplicate keys, fragments (#...), international characters and
empty fields. Parameter order is kept stable: existing non-UTM params first,
then UTMs in canonical order, then custom params.
"""
from urllib.parse import parse_qsl, quote, urlsplit, urlunsplit

from ..schemas import UTM_FIELDS, GenerateRequest

# RFC 3986 sub-delims that are safe inside a query value, kept readable.
_QUERY_SAFE = "-._~"


def sanitize_value(value: str) -> str:
    """Normalize a UTM value: trim, lowercase, spaces -> underscores."""
    return "_".join(value.strip().lower().split())


def _encode(value: str) -> str:
    return quote(value, safe=_QUERY_SAFE)


def build_utm_url(req: GenerateRequest) -> str:
    parts = urlsplit(req.base_url.strip())

    existing = parse_qsl(parts.query, keep_blank_values=True)

    utm_values: dict[str, str] = {}
    for field in UTM_FIELDS:
        raw = getattr(req, field, "") or ""
        cleaned = sanitize_value(raw)
        if cleaned:
            utm_values[field] = cleaned

    custom: dict[str, str] = {}
    for key, value in (req.custom_params or {}).items():
        key = sanitize_value(key)
        value = sanitize_value(value)
        if key and value:
            custom[key] = value

    new_keys = set(utm_values) | set(custom)

    kept: list[tuple[str, str]] = []
    seen: set[str] = set()
    for key, value in existing:
        lowered = key.lower()
        if lowered in seen:
            continue  # drop duplicate existing parameters
        if lowered in new_keys:
            seen.add(lowered)
            continue  # will be re-added with the new value
        if lowered.startswith("utm_") and req.override_existing_utms:
            continue  # stale UTMs are replaced wholesale
        seen.add(lowered)
        kept.append((lowered, value))

    pairs: list[str] = []
    for key, value in kept:
        pairs.append(f"{_encode(key)}={_encode(value)}")
    for field in UTM_FIELDS:
        if field in utm_values:
            pairs.append(f"{field}={_encode(utm_values[field])}")
    for key, value in custom.items():
        pairs.append(f"{_encode(key)}={_encode(value)}")

    query = "&".join(pairs)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, parts.fragment))
