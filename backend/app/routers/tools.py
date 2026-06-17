"""Utility endpoints: URL shortener and QR codes.

These are simplified endpoints for backward compatibility.
New code should use /links and /qr endpoints instead.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.qr_generator import generate_qr
from .deps import Identity, audit, get_identity

router = APIRouter(tags=["tools"])


@router.post("/shorten")
def shorten_url(
    url: str = Query(...),
    custom_alias: str = Query(default=""),
    db: Session = Depends(get_db),
    identity: Identity = Depends(get_identity),
):
    """Shortcut endpoint to shorten a URL.

    For full control, use POST /links instead.
    """
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="A full http(s) URL is required.")

    from ..services.link_service import generate_short_code, build_short_url
    import uuid

    short_code = generate_short_code(db, custom_alias or None)
    short_url = build_short_url(short_code)

    # Create a minimal link record
    from ..models import Link
    org_id = uuid.UUID(identity.org_id) if identity.org_id else uuid.UUID(int=0)
    link = Link(
        org_id=org_id,
        destination_url=url,
        final_url=url,
        short_code=short_code,
    )
    db.add(link)
    db.commit()

    audit(db, identity, "shorten_url", short_url)
    return {"short_url": short_url, "short_code": short_code}


@router.get("/qr")
def qr_code(
    url: str = Query(..., min_length=10),
    fmt: str = Query("png", pattern="^(png|svg|pdf)$"),
    scale: int = Query(8, ge=2, le=30),
):
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="A full http(s) URL is required.")
    data, media = generate_qr(url, fmt=fmt, scale=scale)
    ext = fmt
    return Response(content=data, media_type=media, headers={
        "Content-Disposition": f'inline; filename="trackflow_qr.{ext}"'})
