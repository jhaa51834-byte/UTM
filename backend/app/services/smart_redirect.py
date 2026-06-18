"""Smart redirect engine.

Builds a ``ClickContext`` from the incoming request and evaluates a link's
routing rules against it. The first active rule (lowest ``priority``) whose
conditions all match wins; its destination overrides the link's default.

All matching logic is pure and exception-safe: a malformed condition can never
crash a redirect, it simply fails to match.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from ..utils.geo import lookup as geo_lookup
from ..utils.ua_parser import parse_user_agent

_TEXT_FIELDS = {"country", "country_code", "region", "city", "device_type", "browser", "os", "language"}
_NUMERIC_FIELDS = {"hour", "weekday"}
_DATE_FIELDS = {"date"}

# Days: Monday=0 .. Sunday=6 (matches datetime.weekday())
_WEEKDAY_ALIASES = {
    "mon": 0, "monday": 0, "tue": 1, "tuesday": 1, "wed": 2, "wednesday": 2,
    "thu": 3, "thursday": 3, "fri": 4, "friday": 4, "sat": 5, "saturday": 5,
    "sun": 6, "sunday": 6,
}


@dataclass
class ClickContext:
    """Everything a routing rule can be evaluated against."""
    country: str = ""
    country_code: str = ""
    region: str = ""
    city: str = ""
    device_type: str = ""
    browser: str = ""
    os: str = ""
    language: str = ""
    hour: int = 0          # UTC hour 0-23
    weekday: int = 0       # Monday=0 .. Sunday=6
    date: str = ""         # YYYY-MM-DD (UTC)

    def get(self, field: str) -> Any:
        return getattr(self, field, None)


def parse_accept_language(header: str) -> str:
    """Return the primary language subtag, e.g. 'en-US,en;q=0.9' -> 'en'."""
    if not header:
        return ""
    first = header.split(",")[0].strip()
    primary = first.split(";")[0].strip()
    return primary.split("-")[0].lower()


def build_context(
    ip_address: str,
    user_agent: str,
    accept_language: str = "",
    now: datetime | None = None,
) -> ClickContext:
    """Assemble a ClickContext from raw request signals."""
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    geo = geo_lookup(ip_address)
    ua = parse_user_agent(user_agent)
    return ClickContext(
        country=(geo.country or "").lower(),
        country_code=(geo.country_code or "").lower(),
        region=(geo.region or "").lower(),
        city=(geo.city or "").lower(),
        device_type=(ua.device_type or "").lower(),
        browser=(ua.browser or "").lower(),
        os=(ua.os or "").lower(),
        language=parse_accept_language(accept_language),
        hour=now.hour,
        weekday=now.weekday(),
        date=now.date().isoformat(),
    )


def _normalize_weekday(value: Any) -> int | None:
    """Accept 0-6 or names like 'mon'/'friday'."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    s = str(value).strip().lower()
    if s.isdigit():
        return int(s)
    return _WEEKDAY_ALIASES.get(s)


def _condition_matches(cond: dict, ctx: ClickContext) -> bool:
    """Evaluate one condition. Never raises — returns False on bad input."""
    try:
        field = cond["field"]
        operator = cond["operator"]
        value = cond["value"]
    except (KeyError, TypeError):
        return False

    actual = ctx.get(field)
    if actual is None:
        return False

    try:
        if field in _NUMERIC_FIELDS:
            return _match_numeric(field, int(actual), operator, value)
        if field in _DATE_FIELDS:
            return _match_ordinal(str(actual), operator, value)
        if field in _TEXT_FIELDS:
            return _match_text(str(actual).lower(), operator, value)
    except (ValueError, TypeError):
        return False
    return False


def _match_text(actual: str, operator: str, value: Any) -> bool:
    if operator == "equals":
        return actual == str(value).lower()
    if operator == "not_equals":
        return actual != str(value).lower()
    if operator == "contains":
        return str(value).lower() in actual
    if operator == "in":
        return actual in {str(v).lower() for v in value}
    if operator == "not_in":
        return actual not in {str(v).lower() for v in value}
    return False


def _match_numeric(field: str, actual: int, operator: str, value: Any) -> bool:
    def to_num(v: Any) -> int:
        if field == "weekday":
            n = _normalize_weekday(v)
            if n is None:
                raise ValueError("bad weekday")
            return n
        return int(v)

    if operator == "equals":
        return actual == to_num(value)
    if operator == "not_equals":
        return actual != to_num(value)
    if operator == "gte":
        return actual >= to_num(value)
    if operator == "lte":
        return actual <= to_num(value)
    if operator == "in":
        return actual in {to_num(v) for v in value}
    if operator == "not_in":
        return actual not in {to_num(v) for v in value}
    if operator == "between":
        lo, hi = to_num(value[0]), to_num(value[1])
        return lo <= actual <= hi
    return False


def _match_ordinal(actual: str, operator: str, value: Any) -> bool:
    """Lexicographic compare — correct for ISO YYYY-MM-DD date strings."""
    if operator == "equals":
        return actual == str(value)
    if operator == "not_equals":
        return actual != str(value)
    if operator == "gte":
        return actual >= str(value)
    if operator == "lte":
        return actual <= str(value)
    if operator == "between":
        return str(value[0]) <= actual <= str(value[1])
    if operator == "in":
        return actual in {str(v) for v in value}
    if operator == "not_in":
        return actual not in {str(v) for v in value}
    return False


def rule_matches(conditions: Iterable[dict], ctx: ClickContext) -> bool:
    """True only if every condition matches (logical AND)."""
    conditions = list(conditions or [])
    if not conditions:
        return False
    return all(_condition_matches(c, ctx) for c in conditions)


def evaluate_rules(rules: Iterable[Any], ctx: ClickContext) -> Any | None:
    """Return the first active, matching rule by ascending priority, else None.

    ``rules`` are objects exposing ``.is_active``, ``.priority`` and
    ``.conditions`` (a list of dicts).
    """
    active = [r for r in rules if getattr(r, "is_active", True)]
    active.sort(key=lambda r: (getattr(r, "priority", 100), str(getattr(r, "created_at", ""))))
    for rule in active:
        if rule_matches(getattr(rule, "conditions", []), ctx):
            return rule
    return None


def merge_link_utms(url: str, link: Any) -> str:
    """Append the link's UTM/custom params to ``url`` without overwriting any
    parameter already present on the target. Keeps campaign attribution
    consistent across routed/variant destinations.
    """
    try:
        parts = urlsplit(url)
        existing = parse_qsl(parts.query, keep_blank_values=True)
        existing_keys = {k for k, _ in existing}

        extra: list[tuple[str, str]] = []
        for key in ("utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"):
            val = getattr(link, key, "") or ""
            if val and key not in existing_keys:
                extra.append((key, val))
        for key, val in (getattr(link, "custom_params", {}) or {}).items():
            if val and key not in existing_keys:
                extra.append((key, str(val)))

        if not extra:
            return url
        query = urlencode(existing + extra, doseq=True)
        return urlunsplit((parts.scheme, parts.netloc, parts.path, query, parts.fragment))
    except Exception:
        return url
