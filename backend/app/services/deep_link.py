"""Smart deep-linking engine.

Pure, exception-safe helpers used by the redirect handler to:
  * detect the visitor's platform (Android / iOS / Desktop),
  * build an Android ``intent://`` URL with a Play Store fallback,
  * render an interstitial that opens the native app and falls back to the
    app store when the app is not installed,
  * compute a coarse device fingerprint for deferred deep linking.

No database or network access here — everything is deterministic and testable.
"""
from __future__ import annotations

import hashlib
import json
from html import escape
from urllib.parse import quote, urlsplit

from ..utils.ua_parser import parse_user_agent


def detect_platform(user_agent: str) -> str:
    """Classify a raw User-Agent string as 'android', 'ios', or 'desktop'.

    Reads the UA directly (not the generic OS parser) because Android UAs also
    contain 'Linux', which would otherwise misclassify them as desktop.
    """
    ua = (user_agent or "").lower()
    if "android" in ua:
        return "android"
    if "iphone" in ua or "ipad" in ua or "ipod" in ua:
        return "ios"
    return "desktop"


def device_fingerprint(ip_address: str, user_agent: str) -> str:
    """Coarse fingerprint (IP + OS + device) for deferred deep-link matching.

    Deferred deep linking can't use cookies across the store round-trip, so the
    standard heuristic is to match the install back to the click by a coarse
    device signature within a short TTL.
    """
    ua = parse_user_agent(user_agent)
    raw = f"{ip_address}|{ua.os}|{ua.device_type}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def build_intent_url(deep_link: str, package: str, fallback_url: str) -> str:
    """Build an Android ``intent://`` URL so Chrome opens the app or, if absent,
    the Play Store fallback — natively, without JS timers.
    """
    parts = urlsplit(deep_link)
    scheme = parts.scheme or "https"
    prefix = f"{scheme}://"
    ssp = deep_link[len(prefix):] if deep_link.startswith(prefix) else deep_link
    intent = f"intent://{ssp}#Intent;scheme={scheme};"
    if package:
        intent += f"package={package};"
    if fallback_url:
        intent += f"S.browser_fallback_url={quote(fallback_url, safe='')};"
    intent += "end"
    return intent


def choose_targets(config, platform: str) -> tuple[str, str]:
    """Return ``(app_target, store_url)`` for a platform.

    ``app_target`` is what the page should open first (an Android intent URL or
    an iOS app scheme); ``store_url`` is the fallback. Either may be empty.
    """
    if platform == "android":
        deep = (config.android_deep_link or "").strip()
        store = (config.play_store_url or "").strip()
        if deep:
            return build_intent_url(deep, config.android_package_name or "", store), store
        return store, store
    if platform == "ios":
        deep = (config.ios_deep_link or "").strip()
        store = (config.app_store_url or "").strip()
        return (deep or store), store
    return "", ""


def raw_deep_link(config, platform: str) -> str:
    """The platform's app-scheme URI (for deferred storage / display)."""
    if platform == "android":
        return (config.android_deep_link or "").strip()
    if platform == "ios":
        return (config.ios_deep_link or "").strip()
    return ""


def build_interstitial_html(
    app_target: str,
    store_url: str,
    platform: str,
    timeout_ms: int = 1500,
) -> str:
    """Interstitial that opens the app, falling back to the store on timeout."""
    app_js = json.dumps(app_target or store_url)
    store_js = json.dumps(store_url or app_target)
    store_href = escape(store_url or app_target, quote=True)
    label = "Google Play" if platform == "android" else "the App Store"
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Opening app…</title>
<style>
  body{{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#0b0b10;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e5e7eb}}
  .card{{width:340px;max-width:90vw;text-align:center;background:#15151d;
         border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:32px}}
  .ico{{font-size:34px;margin-bottom:14px}}
  h1{{font-size:17px;margin:0 0 6px}} p{{font-size:13px;color:#9ca3af;margin:0 0 18px}}
  a.btn{{display:inline-block;padding:11px 18px;border-radius:10px;text-decoration:none;font-weight:700;
         color:#fff;background:linear-gradient(135deg,#7c3aed,#d946ef)}}
</style></head>
<body><div class="card">
  <div class="ico">📲</div>
  <h1>Opening the app…</h1>
  <p>If nothing happens, you'll be taken to {label}.</p>
  <a class="btn" id="store" href="{store_href}">Continue</a>
<script>
  (function(){{
    var app={app_js}, store={store_js}, t=Date.now();
    if(store){{ setTimeout(function(){{ if(Date.now()-t < {timeout_ms}+400) location.replace(store); }}, {timeout_ms}); }}
    if(app){{ location.replace(app); }}
  }})();
</script>
</div></body></html>"""
