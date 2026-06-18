"""Links router: CRUD, toggle, short URL creation."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..deps import CurrentUser, PaginationParams, get_db, require_role
from ..schemas.common import DeleteResponse, PaginatedResponse
from ..schemas.link import LinkCreate, LinkOut, LinkToggle, LinkUpdate
from ..services.link_service import (
    build_short_url, create_link, delete_link, generate_short_code,
    get_links, update_link,
)
from ..services.utm_builder import build_utm_url, sanitize_value
from ..schemas.utm import GenerateRequest

router = APIRouter(prefix="/links", tags=["links"])


def _to_out(link, domain: str | None = None) -> LinkOut:
    """Convert Link model to LinkOut schema."""
    d = LinkOut.model_validate(link)
    d.short_url = build_short_url(link.short_code, domain)
    d.has_password = bool(link.password_hash)
    return d


@router.post("", response_model=LinkOut, status_code=status.HTTP_201_CREATED)
def create(
    req: LinkCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("marketing_manager")),
):
    """Create a new short link."""
    org_id = user.require_org()

    # Generate UTM URL if UTM params provided
    final_url = req.destination_url
    if any([req.utm_source, req.utm_medium, req.utm_campaign]):
        gen_req = GenerateRequest(
            base_url=req.destination_url,
            utm_source=req.utm_source,
            utm_medium=req.utm_medium,
            utm_campaign=req.utm_campaign,
            utm_content=req.utm_content,
            utm_term=req.utm_term,
            custom_params=req.custom_params,
        )
        final_url = build_utm_url(gen_req)

    short_code = generate_short_code(db, req.custom_alias)

    link = create_link(
        db=db,
        org_id=org_id,
        user_id=user.id,
        destination_url=req.destination_url,
        final_url=final_url,
        short_code=short_code,
        domain_id=req.domain_id,
        campaign_id=req.campaign_id,
        team_id=req.team_id,
        title=req.title,
        utm_source=sanitize_value(req.utm_source),
        utm_medium=sanitize_value(req.utm_medium),
        utm_campaign=sanitize_value(req.utm_campaign),
        utm_content=sanitize_value(req.utm_content),
        utm_term=sanitize_value(req.utm_term),
        custom_params=req.custom_params,
        password=req.password,
        expires_at=req.expires_at,
        max_clicks=req.max_clicks,
        tags=req.tags,
    )
    return _to_out(link)


@router.get("", response_model=PaginatedResponse[LinkOut])
def list_links(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("viewer")),
    pagination: PaginationParams = Depends(),
    search: str = Query(default="", max_length=255),
    campaign_id: UUID | None = Query(default=None),
    is_active: bool | None = Query(default=None),
):
    """List links for the current organization."""
    org_id = user.require_org()
    links, total = get_links(
        db, org_id, pagination.offset, pagination.page_size, search, campaign_id, is_active,
    )
    total_pages = (total + pagination.page_size - 1) // pagination.page_size
    return PaginatedResponse(
        items=[_to_out(l) for l in links],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=total_pages,
    )


@router.get("/{link_id}", response_model=LinkOut)
def get_link(
    link_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("viewer")),
):
    """Get a single link by ID."""
    from ..models.link import Link
    link = db.query(Link).filter(Link.id == link_id, Link.org_id == user.require_org()).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")
    return _to_out(link)


@router.put("/{link_id}", response_model=LinkOut)
def update(
    link_id: UUID,
    req: LinkUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("marketing_manager")),
):
    """Update a link."""
    from ..models.link import Link
    link = db.query(Link).filter(Link.id == link_id, Link.org_id == user.require_org()).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")
    updated = update_link(db, link, **req.model_dump(exclude_unset=True))
    return _to_out(updated)


@router.delete("/{link_id}", response_model=DeleteResponse)
def delete(
    link_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("marketing_manager")),
):
    """Delete a link."""
    from ..models.link import Link
    link = db.query(Link).filter(Link.id == link_id, Link.org_id == user.require_org()).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")
    delete_link(db, link_id)
    return DeleteResponse(deleted=1)


@router.patch("/{link_id}/toggle", response_model=LinkOut)
def toggle(
    link_id: UUID,
    req: LinkToggle,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("marketing_manager")),
):
    """Enable or disable a link."""
    from ..models.link import Link
    link = db.query(Link).filter(Link.id == link_id, Link.org_id == user.require_org()).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")
    link.is_active = req.is_active
    db.commit()
    db.refresh(link)
    return _to_out(link)
