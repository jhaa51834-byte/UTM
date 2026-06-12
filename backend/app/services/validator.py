"""URL + UTM validation engine.

Produces a list of issues (error/warning/info) covering: invalid URLs,
missing source/medium, duplicate parameters, invalid characters, mixed
casing, pre-existing UTMs and over-long URLs.
"""
import re
from urllib.parse import parse_qsl, urlsplit

from ..config import settings
from ..schemas import UTM_FIELDS, ValidateRequest, ValidationIssue

_RECOMMENDED_VALUE_RE = re.compile(r"^[a-z0-9_\-.]+$")


def _issue(level: str, code: str, message: str, field: str = "") -> ValidationIssue:
    return ValidationIssue(level=level, code=code, message=message, field=field)


def validate_base_url(base_url: str) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    url = (base_url or "").strip()

    if not url:
        issues.append(_issue("error", "empty_url", "Destination URL is required.", "base_url"))
        return issues

    parts = urlsplit(url)
    if parts.scheme not in ("http", "https"):
        issues.append(_issue(
            "error", "invalid_scheme",
            "URL must start with http:// or https://.", "base_url"))
    if not parts.netloc or "." not in parts.netloc.strip("[]").split(":")[0]:
        # allow IPv6 hosts in brackets; otherwise require a dotted hostname
        if not (parts.netloc.startswith("[") and parts.netloc.rstrip("]").count(":") >= 2):
            issues.append(_issue(
                "error", "invalid_host",
                "URL is missing a valid domain name.", "base_url"))
    if " " in url:
        issues.append(_issue(
            "error", "whitespace_in_url",
            "URL contains spaces — remove or encode them.", "base_url"))

    # duplicate parameters already present in the URL
    keys = [k.lower() for k, _ in parse_qsl(parts.query, keep_blank_values=True)]
    dupes = sorted({k for k in keys if keys.count(k) > 1})
    if dupes:
        issues.append(_issue(
            "warning", "duplicate_params",
            f"URL already contains duplicate parameters ({', '.join(dupes)}); "
            "duplicates will be removed.", "base_url"))

    existing_utms = sorted({k for k in keys if k.startswith("utm_")})
    if existing_utms:
        issues.append(_issue(
            "warning", "existing_utms",
            f"URL already contains UTM parameters ({', '.join(existing_utms)}); "
            "they will be replaced by your new values.", "base_url"))

    return issues


def validate_params(req: ValidateRequest) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []

    if not (req.utm_source or "").strip():
        issues.append(_issue(
            "error", "missing_source",
            "utm_source is required — GA4 reports traffic as (direct) without it.",
            "utm_source"))
    if not (req.utm_medium or "").strip():
        issues.append(_issue(
            "error", "missing_medium",
            "utm_medium is required — GA4 channel grouping depends on it.",
            "utm_medium"))
    if not (req.utm_campaign or "").strip():
        issues.append(_issue(
            "warning", "missing_campaign",
            "utm_campaign is empty — campaign reports will show (not set).",
            "utm_campaign"))

    all_params: dict[str, str] = {f: getattr(req, f) or "" for f in UTM_FIELDS}
    for key, value in (req.custom_params or {}).items():
        lowered = key.strip().lower()
        if lowered in all_params and all_params[lowered]:
            issues.append(_issue(
                "error", "duplicate_param",
                f"Custom parameter '{key}' duplicates a UTM field.", key))
        all_params[lowered] = value

    for field, value in all_params.items():
        value = (value or "").strip()
        if not value:
            continue
        if value != value.lower():
            issues.append(_issue(
                "warning", "mixed_casing",
                f"{field} contains uppercase letters ('{value}'). GA4 is "
                "case-sensitive: 'Google' and 'google' report as different sources.",
                field))
        normalized = value.lower().replace(" ", "_")
        if not _RECOMMENDED_VALUE_RE.match(normalized):
            issues.append(_issue(
                "warning", "invalid_characters",
                f"{field} contains characters outside a-z, 0-9, _ - . "
                "They will be URL-encoded, which hurts report readability.",
                field))
        if " " in value:
            issues.append(_issue(
                "info", "spaces_replaced",
                f"Spaces in {field} will be replaced with underscores.", field))

    return issues


def validate_all(req: ValidateRequest, final_url: str = "") -> list[ValidationIssue]:
    issues = validate_base_url(req.base_url) + validate_params(req)
    url_len = len(final_url or req.base_url or "")
    if url_len > settings.max_url_length:
        issues.append(_issue(
            "warning", "url_too_long",
            f"Final URL is {url_len} characters; URLs over "
            f"{settings.max_url_length} may be truncated by some platforms.",
            "base_url"))
    return issues
