"""QR code router: generate and serve QR codes."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..deps import CurrentUser, RequireManager, RequireViewer, get_db
from ..models.qr_code import QRCode
from ..schemas.qr import QRCreate, QROut
from ..services.qr_generator import generate_qr, generate_qr_with_style

router = APIRouter(prefix="/qr", tags=["qr-codes"])


@router.post("", response_model=QROut, status_code=201)
def create_qr(
    req: QRCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(RequireManager),
):
    """Create and store a QR code."""
    org_id = user.require_org()

    target_url = req.target_url
    if req.link_id:
        from ..models.link import Link
        link = db.query(Link).filter(Link.id == req.link_id, Link.org_id == org_id).first()
        if not link:
            raise HTTPException(status_code=404, detail="Link not found.")
        from ..services.link_service import build_short_url
        target_url = build_short_url(link.short_code)

    if not target_url:
        raise HTTPException(status_code=400, detail="target_url or link_id required.")

    qr_record = QRCode(
        org_id=org_id,
        link_id=req.link_id,
        name=req.name,
        target_url=target_url,
        format=req.format,
        style=req.style,
        created_by=user.id,
    )
    db.add(qr_record)
    db.commit()
    db.refresh(qr_record)
    return QROut.model_validate(qr_record)


@router.get("/{qr_id}/download")
def download_qr(
    qr_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(RequireViewer),
):
    """Download a QR code image."""
    org_id = user.require_org()
    qr = db.query(QRCode).filter(QRCode.id == qr_id, QRCode.org_id == org_id).first()
    if not qr:
        raise HTTPException(status_code=404, detail="QR code not found.")

    data, media_type = generate_qr_with_style(qr.target_url, qr.style, qr.format)
    ext = qr.format
    return Response(
        content=data,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="qr_{qr.id}.{ext}"'},
    )


@router.get("/generate")
def generate_inline(
    url: str = Query(...),
    fmt: str = Query(default="png", regex="^(png|svg|pdf)$"),
    scale: int = Query(default=8, ge=1, le=30),
):
    """Generate a QR code on the fly (no auth required, no storage)."""
    data, media_type = generate_qr(url, fmt, scale)
    return Response(content=data, media_type=media_type)
