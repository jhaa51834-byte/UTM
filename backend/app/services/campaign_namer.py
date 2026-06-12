"""Smart campaign name generation.

Joins arbitrary parts (product, region, quarter, year, ...) into a
standards-compliant campaign name: lowercase, underscores, no special
characters. CamelCase inputs are split into words first, so
"AnalyticsTool" -> "analytics_tool".
"""
import re
import unicodedata

_CAMEL_RE = re.compile(r"(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])")
_INVALID_RE = re.compile(r"[^a-z0-9]+")


def slugify_part(part: str) -> str:
    part = _CAMEL_RE.sub(" ", part.strip())
    # Fold accents (é -> e) so international input yields portable names.
    part = unicodedata.normalize("NFKD", part).encode("ascii", "ignore").decode("ascii")
    part = part.lower()
    part = _INVALID_RE.sub("_", part)
    return part.strip("_")


def generate_campaign_name(parts: list[str]) -> str:
    slugs = [slugify_part(p) for p in parts]
    return "_".join(s for s in slugs if s)
