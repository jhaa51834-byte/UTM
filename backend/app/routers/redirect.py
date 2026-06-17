"""Short URL redirect handler + click tracking."""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..deps import get_db
from ..services.click_tracker import build_click_event, record_click, record_click_redis
from ..services.link_service import increment_click_count, resolve_short_code

router = APIRouter(tags=["redirect"])


@router.get("/r/{short_code}")
async def redirect_short_url(
    short_code: str,
    request: Request,
    db: Session = Depends(get_db),
    qr: bool = False,
):
    """Resolve a short URL and redirect.

    Also records the click event to ClickHouse and Redis.
    Append ?qr=1 for QR scan tracking.
    """
    link = resolve_short_code(db, short_code)
    if not link:
        raise HTTPException(status_code=404, detail="Link not found or expired.")

    # Password-protected links require /r/{code}+ to preview
    if link.password_hash:
        # For now, redirect anyway; password check would be a separate page
        pass

    # Record click asynchronously (non-blocking)
    ip = request.client.host if request.client else "0.0.0.0"
    ua = request.headers.get("user-agent", "")
    referrer = request.headers.get("referer", "")

    event = build_click_event(
        link_id=link.id,
        org_id=link.org_id,
        short_code=short_code,
        ip_address=ip,
        user_agent=ua,
        referrer=referrer,
        utm_source=link.utm_source,
        utm_medium=link.utm_medium,
        utm_campaign=link.utm_campaign,
        utm_content=link.utm_content,
        utm_term=link.utm_term,
        is_qr_scan=qr,
    )

    # Fire-and-forget click recording
    try:
        await record_click(event)
        await record_click_redis(str(link.id), str(link.org_id))
    except Exception:
        pass  # Never block redirects

    # Update denormalized counter
    increment_click_count(db, link.id)

    # 302 redirect (not 301, so browsers don't cache and we keep tracking)
    return RedirectResponse(url=link.final_url, status_code=302)


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
    }
