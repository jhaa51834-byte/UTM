"""Link service: URL shortening with Base62, collision prevention, CRUD."""
from __future__ import annotations

import random
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..models.link import Link
from ..utils.base62 import ALPHABET, encode_padded
from ..utils.hashing import hash_password


def generate_short_code(db: Session, custom_alias: str | None = None, length: int = 7) -> str:
    """Generate a unique short code.

    If custom_alias is provided, validate it's unique and return it.
    Otherwise generate a random Base62 code with collision prevention.
    """
    if custom_alias:
        custom_alias = custom_alias.strip()
        existing = db.query(Link).filter(Link.short_code == custom_alias).first()
        if existing:
            raise ValueError(f"Short code '{custom_alias}' is already taken.")
        return custom_alias

    # Generate random Base62 code with collision check
    max_attempts = 10
    for _ in range(max_attempts):
        code = _random_code(length)
        existing = db.query(Link).filter(Link.short_code == code).first()
        if not existing:
            return code

    # If collisions persist, increase length
    return _random_code(length + 2)


def _random_code(length: int) -> str:
    """Generate a random Base62 string of given length."""
    return "".join(random.choices(ALPHABET, k=length))


def build_short_url(short_code: str, domain: str | None = None) -> str:
    """Build the full short URL from code and domain."""
    d = domain or settings.default_short_domain
    scheme = "https" if not d.startswith("localhost") else "http"
    return f"{scheme}://{d}/{short_code}"


def create_link(
    db: Session,
    org_id: uuid.UUID,
    user_id: uuid.UUID | None,
    destination_url: str,
    final_url: str,
    short_code: str,
    domain_id: uuid.UUID | None = None,
    campaign_id: uuid.UUID | None = None,
    team_id: uuid.UUID | None = None,
    title: str = "",
    utm_source: str = "",
    utm_medium: str = "",
    utm_campaign: str = "",
    utm_content: str = "",
    utm_term: str = "",
    custom_params: dict | None = None,
    password: str | None = None,
    expires_at: datetime | None = None,
    max_clicks: int | None = None,
    tags: list[str] | None = None,
) -> Link:
    """Create a new short link in the database."""
    link = Link(
        org_id=org_id,
        created_by=user_id,
        destination_url=destination_url.strip(),
        final_url=final_url,
        short_code=short_code,
        domain_id=domain_id,
        campaign_id=campaign_id,
        team_id=team_id,
        title=title,
        utm_source=utm_source,
        utm_medium=utm_medium,
        utm_campaign=utm_campaign,
        utm_content=utm_content,
        utm_term=utm_term,
        custom_params=custom_params or {},
        password_hash=hash_password(password) if password else None,
        expires_at=expires_at,
        max_clicks=max_clicks,
        tags=tags or [],
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def resolve_short_code(db: Session, short_code: str) -> Link | None:
    """Resolve a short code to its Link record.

    Returns None if not found, expired, disabled, or click limit reached.
    """
    link = db.query(Link).filter(Link.short_code == short_code).first()
    if not link:
        return None
    if not link.is_active:
        return None
    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        return None
    if link.max_clicks and link.click_count >= link.max_clicks:
        return None
    return link


def increment_click_count(db: Session, link_id: uuid.UUID) -> None:
    """Atomically increment the click count on a link."""
    db.query(Link).filter(Link.id == link_id).update(
        {Link.click_count: Link.click_count + 1}
    )
    db.commit()


def get_links(
    db: Session,
    org_id: uuid.UUID,
    offset: int = 0,
    limit: int = 20,
    search: str = "",
    campaign_id: uuid.UUID | None = None,
    is_active: bool | None = None,
) -> tuple[list[Link], int]:
    """Get paginated links for an organization."""
    query = db.query(Link).filter(Link.org_id == org_id)

    if search:
        query = query.filter(
            Link.title.ilike(f"%{search}%")
            | Link.destination_url.ilike(f"%{search}%")
            | Link.short_code.ilike(f"%{search}%")
            | Link.utm_campaign.ilike(f"%{search}%")
        )

    if campaign_id:
        query = query.filter(Link.campaign_id == campaign_id)
    if is_active is not None:
        query = query.filter(Link.is_active == is_active)

    total = query.count()
    links = query.order_by(Link.created_at.desc()).offset(offset).limit(limit).all()
    return links, total


def update_link(db: Session, link: Link, **kwargs) -> Link:
    """Update link fields."""
    for key, value in kwargs.items():
        if value is not None and hasattr(link, key):
            if key == "password":
                link.password_hash = hash_password(value) if value else None
            else:
                setattr(link, key, value)
    link.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(link)
    return link


def delete_link(db: Session, link_id: uuid.UUID) -> bool:
    """Delete a link."""
    link = db.query(Link).filter(Link.id == link_id).first()
    if not link:
        return False
    db.delete(link)
    db.commit()
    return True
