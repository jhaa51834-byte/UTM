"""Marketing tag validator.

Inspects a page's HTML for analytics / tag-manager / data-layer / advertising
tags (GA4, Universal Analytics, Google Tag Manager, Adobe Analytics & Launch,
Tealium, Meta Pixel) and produces a structured report with extracted IDs and
recommendations.

``detect_tags`` is pure and exhaustively unit-tested. ``fetch_url`` performs the
network fetch behind a basic SSRF guard (http/https only, private/reserved IPs
rejected).
"""
from __future__ import annotations

import ipaddress
import re
import socket
from urllib.parse import parse_qsl, urlsplit

import httpx

from ..schemas.tag_validation import (
    Recommendation, TagFinding, TagValidationReport,
)

_MAX_BYTES = 2_000_000  # cap fetched HTML at ~2MB


# (key, label, category, substring evidence patterns, id regex or None)
_DETECTORS = [
    ("ga4", "Google Analytics 4 (gtag)", "analytics",
     ["googletagmanager.com/gtag/js", "gtag("], r"G-[A-Z0-9]{4,}"),
    ("ua", "Universal Analytics (legacy)", "analytics",
     ["google-analytics.com/analytics.js", "ga('create'", "ga(\"create\""], r"UA-\d{4,}-\d+"),
    ("gtm", "Google Tag Manager", "tag_manager",
     ["googletagmanager.com/gtm.js", "googletagmanager.com/ns.html"], r"GTM-[A-Z0-9]{4,}"),
    ("adobe_analytics", "Adobe Analytics", "analytics",
     ["appmeasurement", "s_code", "omtrdc.net", "/b/ss/"], None),
    ("adobe_launch", "Adobe Launch / DTM", "tag_manager",
     ["assets.adobedtm.com", "_satellite"], None),
    ("tealium", "Tealium", "tag_manager",
     ["tags.tiqcdn.com", "utag.js", "utag.sync"], None),
    ("meta_pixel", "Meta (Facebook) Pixel", "advertising",
     ["connect.facebook.net", "fbevents.js", "fbq("], r"fbq\(\s*['\"]init['\"]\s*,\s*['\"](\d{6,})['\"]"),
]

_DATA_LAYERS = [
    ("dataLayer", "dataLayer (GTM)"),
    ("digitalData", "digitalData (W3C / Adobe)"),
    ("utag_data", "utag_data (Tealium)"),
]


def _dedupe(seq: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for s in seq:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out


def detect_tags(html: str, url: str = "") -> TagValidationReport:
    """Scan HTML (and an optional URL) for marketing tags. Pure, never raises."""
    html = html or ""
    low = html.lower()

    tags: list[TagFinding] = []
    for key, label, category, patterns, id_re in _DETECTORS:
        evidence = next((p for p in patterns if p.lower() in low), "")
        ids: list[str] = []
        if id_re:
            ids = _dedupe(re.findall(id_re, html))
        found = bool(evidence or ids)
        tags.append(TagFinding(
            key=key, label=label, category=category,
            found=found, ids=ids, evidence=evidence,
        ))

    # Data layers
    data_layers = [label for token, label in _DATA_LAYERS if token.lower() in low]

    # UTM parameters from the URL
    utm_params: dict[str, str] = {}
    if url:
        try:
            for k, v in parse_qsl(urlsplit(url).query, keep_blank_values=True):
                if k.lower().startswith("utm_"):
                    utm_params[k] = v
        except Exception:
            pass

    found_map = {t.key: t for t in tags}
    has_analytics = any(found_map[k].found for k in ("ga4", "ua", "adobe_analytics"))
    has_tag_manager = any(found_map[k].found for k in ("gtm", "adobe_launch", "tealium"))

    # Recommendations
    recs: list[Recommendation] = []
    if not has_analytics:
        recs.append(Recommendation(level="error",
            message="No analytics tag detected (GA4, Universal Analytics or Adobe). Add GA4."))
    if found_map["ua"].found:
        recs.append(Recommendation(level="warning",
            message="Universal Analytics is deprecated — migrate to GA4."))
    if found_map["ga4"].found and not found_map["ga4"].ids:
        recs.append(Recommendation(level="warning",
            message="GA4/gtag detected but no G-XXXX measurement ID was found."))
    if has_tag_manager and not data_layers:
        recs.append(Recommendation(level="info",
            message="A tag manager is present but no data layer (dataLayer/digitalData) was detected."))
    if url and not utm_params:
        recs.append(Recommendation(level="info",
            message="Destination URL has no UTM parameters for campaign attribution."))
    if not recs:
        recs.append(Recommendation(level="info", message="Tag coverage looks healthy."))

    # Score
    score = 0
    if has_analytics:
        score += 45
    if has_tag_manager:
        score += 25
    if data_layers:
        score += 15
    if not url or utm_params:
        score += 15
    score = min(100, score)

    return TagValidationReport(
        url=url, fetched=False, score=score, tags=tags,
        utm_present=bool(utm_params), utm_params=utm_params,
        data_layers=data_layers, recommendations=recs,
    )


def _assert_public_host(host: str) -> None:
    """Reject private / loopback / reserved targets (basic SSRF guard)."""
    if not host:
        raise ValueError("missing host")
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as e:
        raise ValueError(f"could not resolve host: {host}") from e
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (ip.is_private or ip.is_loopback or ip.is_link_local
                or ip.is_reserved or ip.is_multicast or ip.is_unspecified):
            raise ValueError("refusing to fetch a private or reserved address")


def fetch_url(url: str) -> str:
    """Fetch a page's HTML behind an SSRF guard. Raises ValueError on failure."""
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https"):
        raise ValueError("only http/https URLs are supported")
    _assert_public_host(parts.hostname or "")
    try:
        resp = httpx.get(
            url, timeout=8.0, follow_redirects=True,
            headers={"User-Agent": "TrackFlowTagValidator/1.0"},
        )
        resp.raise_for_status()
        return resp.text[:_MAX_BYTES]
    except httpx.HTTPError as e:
        raise ValueError(f"could not fetch URL: {e}") from e


def validate(url: str = "", html: str = "") -> TagValidationReport:
    """Validate pasted HTML, or fetch the URL and validate its HTML."""
    if html.strip():
        report = detect_tags(html, url)
        report.fetched = False
        return report
    page = fetch_url(url)
    report = detect_tags(page, url)
    report.fetched = True
    return report
