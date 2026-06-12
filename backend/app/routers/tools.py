"""Utility endpoints: URL shortener and QR codes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import UtmLink
from ..schemas import ShortenRequest, ShortenResponse
from ..services import qr_generator, shortener
from .deps import Identity, audit, get_identity

router = APIRouter(tags=["tools"])


@router.post("/shorten", response_model=ShortenResponse)
def shorten_url(
    req: ShortenRequest,
    db: Session = Depends(get_db),
    identity: Identity = Depends(get_identity),
):
    if not req.url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="A full http(s) URL is required.")
    short = shortener.shorten(req.url, req.provider)
    if req.history_id:
        link = db.get(UtmLink, req.history_id)
        if link:
            link.short_url = short
            db.commit()
    audit(db, identity, "shorten_url", f"{req.provider}: {short}")
    return ShortenResponse(short_url=short, provider=req.provider)


@router.get("/qr")
def qr_code(
    url: str = Query(..., min_length=10),
    fmt: str = Query("png", pattern="^(png|svg)$"),
    scale: int = Query(8, ge=2, le=20),
):
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="A full http(s) URL is required.")
    data, media = qr_generator.make_qr(url, fmt=fmt, scale=scale)
    ext = "svg" if fmt == "svg" else "png"
    return Response(content=data, media_type=media, headers={
        "Content-Disposition": f'inline; filename="utm_qr.{ext}"'})
