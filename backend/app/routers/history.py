"""Generated-URL history with search and filters."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AuditLog, UtmLink
from ..schemas import AuditLogOut, HistoryOut
from .deps import Identity, get_identity, require_admin

router = APIRouter(tags=["history"])


@router.get("/history", response_model=list[HistoryOut])
def get_history(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(default=None, description="Search URL/campaign"),
    source: Optional[str] = None,
    medium: Optional[str] = None,
    created_by: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
):
    query = db.query(UtmLink)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(
            UtmLink.final_url.ilike(like),
            UtmLink.utm_campaign.ilike(like),
            UtmLink.base_url.ilike(like),
        ))
    if source:
        query = query.filter(UtmLink.utm_source == source.lower())
    if medium:
        query = query.filter(UtmLink.utm_medium == medium.lower())
    if created_by:
        query = query.filter(UtmLink.created_by == created_by)
    return (query.order_by(UtmLink.created_at.desc())
            .offset(offset).limit(limit).all())


@router.delete("/history/{link_id}")
def delete_history(
    link_id: int,
    db: Session = Depends(get_db),
    identity: Identity = Depends(get_identity),
):
    link = db.get(UtmLink, link_id)
    if link:
        db.delete(link)
        db.commit()
    return {"deleted": link_id}


@router.get("/audit-logs", response_model=list[AuditLogOut])
def get_audit_logs(
    db: Session = Depends(get_db),
    identity: Identity = Depends(get_identity),
    limit: int = Query(default=200, le=1000),
):
    require_admin(identity)
    return (db.query(AuditLog).order_by(AuditLog.created_at.desc())
            .limit(limit).all())
