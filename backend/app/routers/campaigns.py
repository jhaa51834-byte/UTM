"""Campaigns router: CRUD with slug generation."""
import re
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..deps import (
    CurrentUser, PaginationParams, RequireManager, RequireAdmin,
    RequireViewer, get_db,
)
from ..models.campaign import Campaign
from ..schemas.campaign import CampaignCreate, CampaignOut, CampaignUpdate
from ..schemas.common import DeleteResponse, PaginatedResponse

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


def _slug(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", name.lower().strip()).strip("_")
    return s or f"campaign_{uuid.uuid4().hex[:8]}"


@router.post("", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
def create_campaign(
    req: CampaignCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(RequireManager),
):
    org_id = user.require_org()
    campaign = Campaign(
        org_id=org_id,
        name=req.name,
        slug=_slug(req.name),
        description=req.description,
        start_date=req.start_date,
        end_date=req.end_date,
        tags=req.tags,
        created_by=user.id,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return CampaignOut.model_validate(campaign)


@router.get("", response_model=PaginatedResponse[CampaignOut])
def list_campaigns(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(RequireViewer),
    pagination: PaginationParams = Depends(),
    status_filter: str = Query(default="", alias="status"),
    search: str = Query(default=""),
):
    org_id = user.require_org()
    q = db.query(Campaign).filter(Campaign.org_id == org_id)
    if status_filter:
        q = q.filter(Campaign.status == status_filter)
    if search:
        q = q.filter(Campaign.name.ilike(f"%{search}%"))
    total = q.count()
    items = q.order_by(Campaign.created_at.desc()).offset(pagination.offset).limit(pagination.page_size).all()
    return PaginatedResponse(
        items=[CampaignOut.model_validate(c) for c in items],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=(total + pagination.page_size - 1) // pagination.page_size,
    )


@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(
    campaign_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(RequireViewer),
):
    org_id = user.require_org()
    c = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.org_id == org_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    out = CampaignOut.model_validate(c)
    from ..models.link import Link
    from sqlalchemy import func
    out.link_count = db.query(func.count(Link.id)).filter(Link.campaign_id == campaign_id).scalar() or 0
    out.total_clicks = db.query(func.coalesce(func.sum(Link.click_count), 0)).filter(Link.campaign_id == campaign_id).scalar() or 0
    return out


@router.put("/{campaign_id}", response_model=CampaignOut)
def update_campaign(
    campaign_id: UUID,
    req: CampaignUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(RequireManager),
):
    org_id = user.require_org()
    c = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.org_id == org_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    for k, v in req.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return CampaignOut.model_validate(c)


@router.delete("/{campaign_id}", response_model=DeleteResponse)
def delete_campaign(
    campaign_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(RequireAdmin),
):
    org_id = user.require_org()
    c = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.org_id == org_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found.")
    c.status = "archived"
    db.commit()
    return DeleteResponse(deleted=1)
