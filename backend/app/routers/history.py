"""Generated-URL history with search and filters."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Link
from .deps import Identity, get_identity, require_admin

router = APIRouter(tags=["history"])


@router.get("/history")
def get_history(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(default=None, description="Search URL/campaign"),
    source: Optional[str] = None,
    medium: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
):
    query = db.query(Link)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(
            Link.final_url.ilike(like),
            Link.utm_campaign.ilike(like),
            Link.destination_url.ilike(like),
        ))
    if source:
        query = query.filter(Link.utm_source == source.lower())
    if medium:
        query = query.filter(Link.utm_medium == medium.lower())
    rows = (query.order_by(Link.created_at.desc())
            .offset(offset).limit(limit).all())
    return [
        {
            "id": str(r.id),
            "destination_url": r.destination_url,
            "final_url": r.final_url,
            "short_code": r.short_code,
            "utm_source": r.utm_source,
            "utm_medium": r.utm_medium,
            "utm_campaign": r.utm_campaign,
            "utm_content": r.utm_content,
            "utm_term": r.utm_term,
            "click_count": r.click_count,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.delete("/history/{link_id}")
def delete_history(
    link_id: str,
    db: Session = Depends(get_db),
    identity: Identity = Depends(get_identity),
):
    import uuid
    try:
        uid = uuid.UUID(link_id)
    except ValueError:
        return {"deleted": 0}
    link = db.query(Link).filter(Link.id == uid).first()
    if link:
        db.delete(link)
        db.commit()
        return {"deleted": 1}
    return {"deleted": 0}
