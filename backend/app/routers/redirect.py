"""Short URL redirect handler + click tracking.

Resolution order on every click:
  1. Password gate (interstitial) for protected links
  2. Smart deep linking (mobile -> app or store; desktop -> website)
  3. Smart-redirect routing rules (geo / device / language / time targeting)
  4. A/B test variant split (weighted, optionally sticky per visitor)
  5. The link's default destination (``final_url``)

Deep-link / rule / A-B resolution is fully guarded — it can never break a
redirect; any error falls back to the link's default destination.
"""
import json
from html import escape

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from ..deps import get_db
from ..services.ab_testing import pick_variant
from ..services.click_tracker import build_click_event, record_click, record_click_redis
from ..services.deep_link import (
    build_interstitial_html, choose_targets, detect_platform, device_fingerprint,
    raw_deep_link,
)
from ..services.link_service import (
    increment_click_count, resolve_short_code, verify_link_password,
)
from ..services.smart_redirect import build_context, evaluate_rules, merge_link_utms
from ..utils.hashing import hash_ip

router = APIRouter(tags=["redirect"])


def _resolve_destination(link, request: Request) -> tuple[str, str, str, str]:
    """Pick the final destination for a click.

    Returns ``(target_url, rule_id, variant_id, language)``. Never raises:
    on any error it falls back to the link's default destination.
    """
    ip = request.client.host if request.client else "0.0.0.0"
    ua = request.headers.get("user-agent", "")
    accept_language = request.headers.get("accept-language", "")

    try:
        ctx = build_context(ip, ua, accept_language)
    except Exception:
        return link.final_url, "", "", ""

    # Smart-redirect rules
    try:
        matched = evaluate_rules(list(link.routing_rules or []), ctx)
        if matched is not None:
            return merge_link_utms(matched.destination_url, link), str(matched.id), "", ctx.language
    except Exception:
        pass

    # A/B test split
    try:
        test = link.ab_test
        if test is not None and test.status == "running":
            variants = list(test.variants or [])
            if len(variants) >= 1:
                seed = hash_ip(ip, str(test.id)) if test.sticky else None
                variant = pick_variant(variants, seed)
                if variant is not None:
                    return (merge_link_utms(variant.destination_url, link),
                            "", str(variant.id), ctx.language)
    except Exception:
        pass

    return link.final_url, "", "", ctx.language


async def _record_click(link, request: Request, short_code: str, qr: bool, **extra) -> None:
    """Build + persist a click event and bump the denormalized counter.

    ``extra`` may carry rule_id / variant_id / language / deeplink_outcome.
    Fully guarded — click tracking never blocks a redirect.
    """
    ip = request.client.host if request.client else "0.0.0.0"
    ua = request.headers.get("user-agent", "")
    referrer = request.headers.get("referer", "")
    event = build_click_event(
        link_id=link.id, org_id=link.org_id, short_code=short_code,
        ip_address=ip, user_agent=ua, referrer=referrer,
        utm_source=link.utm_source, utm_medium=link.utm_medium,
        utm_campaign=link.utm_campaign, utm_content=link.utm_content,
        utm_term=link.utm_term, is_qr_scan=qr, **extra,
    )
    try:
        await record_click(event)
        await record_click_redis(str(link.id), str(link.org_id))
    except Exception:
        pass


async def _maybe_deep_link(link, request: Request, short_code: str, qr: bool, db: Session):
    """Serve a deep-link response when the link has an active config.

    Mobile -> interstitial that opens the app (store fallback). Desktop ->
    explicit website if configured, else None to fall through to normal
    resolution. Returns a Response, or None to fall through. Never raises.
    """
    try:
        config = link.deep_link
        if config is None or not config.is_active:
            return None

        ua_header = request.headers.get("user-agent", "")
        platform = detect_platform(ua_header)

        if platform == "desktop":
            desktop = (config.desktop_url or "").strip()
            if not desktop:
                return None  # fall through to rules / A-B / default
            await _record_click(link, request, short_code, qr, deeplink_outcome="desktop")
            increment_click_count(db, link.id)
            return RedirectResponse(url=desktop, status_code=302)

        # Mobile: build app target + store fallback
        app_target, store_url = choose_targets(config, platform)
        if not app_target and not store_url:
            return None  # nothing configured for this platform

        # Deferred deep linking: remember the intended path for post-install.
        if config.deferred:
            deep = raw_deep_link(config, platform)
            if deep:
                try:
                    ip = request.client.host if request.client else "0.0.0.0"
                    fp = device_fingerprint(ip, ua_header)
                    from ..redis import get_redis
                    r = get_redis()
                    await r.setex(
                        f"deferred:{fp}", 3600,
                        json.dumps({"deep_link": deep, "short_code": short_code}),
                    )
                except Exception:
                    pass  # Redis optional

        await _record_click(link, request, short_code, qr, deeplink_outcome=platform)
        increment_click_count(db, link.id)
        return HTMLResponse(build_interstitial_html(app_target, store_url, platform))
    except Exception:
        return None


def _password_gate_html(short_code: str, qr: bool, error: bool = False) -> str:
    """Minimal, self-contained interstitial page asking for the link password."""
    action = f"/r/{escape(short_code)}/verify" + ("?qr=1" if qr else "")
    err = (
        '<p style="color:#f43f5e;font-size:13px;margin:0 0 12px">'
        "Incorrect password. Please try again.</p>"
        if error else ""
    )
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Protected link</title>
<style>
  body{{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#0b0b10;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e5e7eb}}
  .card{{width:340px;max-width:90vw;background:#15151d;border:1px solid rgba(255,255,255,.08);
         border-radius:16px;padding:28px}}
  .lock{{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;
         background:linear-gradient(135deg,#7c3aed,#d946ef);margin-bottom:16px;font-size:22px}}
  h1{{font-size:17px;margin:0 0 6px}} p.sub{{font-size:13px;color:#9ca3af;margin:0 0 18px}}
  input{{width:100%;box-sizing:border-box;padding:11px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.15);
         background:rgba(255,255,255,.05);color:#fff;font-size:14px;margin-bottom:12px}}
  input:focus{{outline:none;border-color:#d946ef;box-shadow:0 0 0 4px rgba(217,70,239,.2)}}
  button{{width:100%;padding:11px;border:0;border-radius:10px;cursor:pointer;font-weight:700;font-size:14px;color:#fff;
          background:linear-gradient(135deg,#7c3aed,#d946ef)}}
</style></head>
<body><div class="card">
  <div class="lock">🔒</div>
  <h1>This link is protected</h1>
  <p class="sub">Enter the password to continue.</p>
  {err}
  <form method="post" action="{action}">
    <input type="password" name="password" placeholder="Password" autofocus required>
    <button type="submit">Unlock</button>
  </form>
</div></body></html>"""


@router.get("/r/{short_code}")
async def redirect_short_url(
    short_code: str,
    request: Request,
    db: Session = Depends(get_db),
    qr: bool = False,
):
    """Resolve a short URL and redirect. Append ?qr=1 for QR scan tracking.

    Protected links return a password gate; deep-link-enabled links return a
    device-aware interstitial.
    """
    link = resolve_short_code(db, short_code)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found or expired.")

    if link.password_hash:
        return HTMLResponse(_password_gate_html(short_code, qr))

    deep = await _maybe_deep_link(link, request, short_code, qr, db)
    if deep is not None:
        return deep

    return await _resolve_and_track(link, request, short_code, qr, db)


@router.post("/r/{short_code}/verify")
async def verify_short_url_password(
    short_code: str,
    request: Request,
    db: Session = Depends(get_db),
    password: str = Form(default=""),
    qr: bool = False,
):
    """Verify a protected link's password; redirect on success, re-prompt on failure."""
    link = resolve_short_code(db, short_code)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found or expired.")

    if link.password_hash and not verify_link_password(link, password):
        return HTMLResponse(_password_gate_html(short_code, qr, error=True), status_code=401)

    deep = await _maybe_deep_link(link, request, short_code, qr, db)
    if deep is not None:
        return deep

    return await _resolve_and_track(link, request, short_code, qr, db)


async def _resolve_and_track(link, request: Request, short_code: str, qr: bool, db: Session) -> RedirectResponse:
    """Shared path: resolve destination, record click, bump counter, redirect."""
    target_url, rule_id, variant_id, language = _resolve_destination(link, request)
    await _record_click(link, request, short_code, qr,
                        language=language, variant_id=variant_id, rule_id=rule_id)
    increment_click_count(db, link.id)
    return RedirectResponse(url=target_url, status_code=302)


@router.get("/r/{short_code}+")
def preview_short_url(
    short_code: str,
    db: Session = Depends(get_db),
):
    """Preview where a short URL goes without redirecting."""
    link = resolve_short_code(db, short_code)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found or expired.")
    return {
        "short_code": short_code,
        "destination_url": link.destination_url,
        "final_url": link.final_url,
        "title": link.title,
        "click_count": link.click_count,
        "is_active": link.is_active,
        "has_password": bool(link.password_hash),
        "routing_rules": len(link.routing_rules or []),
        "ab_test_active": bool(link.ab_test and link.ab_test.status == "running"),
        "deep_link_active": bool(link.deep_link and link.deep_link.is_active),
    }
