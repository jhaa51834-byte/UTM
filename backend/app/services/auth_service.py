"""Authentication service: JWT, password, OAuth, sessions."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from jose import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..models.organization import OrgMembership, Organization
from ..models.user import RefreshToken, User
from ..utils.hashing import generate_token, hash_password, verify_password


def create_access_token(
    user_id: uuid.UUID,
    org_id: uuid.UUID | None = None,
    extra_claims: dict | None = None,
) -> str:
    """Create a JWT access token."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_access_token_expires_minutes),
    }
    if org_id:
        payload["org_id"] = str(org_id)
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: uuid.UUID) -> tuple[str, str]:
    """Create a refresh token. Returns (raw_token, token_hash)."""
    import hashlib
    raw = generate_token(48)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    return raw, token_hash


def register_user(
    db: Session,
    email: str,
    password: str,
    full_name: str,
    org_name: str = "",
) -> tuple[User, Organization | None]:
    """Register a new user and optionally create their organization."""
    # Check if email exists
    existing = db.query(User).filter(User.email == email.lower().strip()).first()
    if existing:
        raise ValueError("Email already registered.")

    user = User(
        email=email.lower().strip(),
        password_hash=hash_password(password),
        full_name=full_name.strip(),
        email_verified=False,
    )
    db.add(user)
    db.flush()

    org = None
    if org_name:
        slug = _generate_slug(org_name)
        org = Organization(name=org_name.strip(), slug=slug)
        db.add(org)
        db.flush()

        membership = OrgMembership(
            user_id=user.id,
            org_id=org.id,
            role="org_admin",
            is_default=True,
        )
        db.add(membership)

    db.commit()
    db.refresh(user)
    if org:
        db.refresh(org)
    return user, org


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Verify email/password and return user if valid."""
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user or not user.password_hash:
        return None
    if not verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return None
    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    return user


def store_refresh_token(
    db: Session,
    user_id: uuid.UUID,
    token_hash: str,
    expires_days: int | None = None,
) -> RefreshToken:
    """Store a hashed refresh token in the database."""
    days = expires_days or settings.jwt_refresh_token_expires_days
    rt = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=days),
    )
    db.add(rt)
    db.commit()
    return rt


def verify_refresh_token(db: Session, raw_token: str) -> User | None:
    """Verify a refresh token and return the associated user."""
    import hashlib
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    rt = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.revoked.is_(False),
    ).first()

    if not rt:
        return None
    if rt.expires_at < datetime.now(timezone.utc):
        return None

    user = db.query(User).filter(User.id == rt.user_id, User.is_active.is_(True)).first()
    return user


def revoke_refresh_token(db: Session, raw_token: str) -> bool:
    """Revoke a refresh token."""
    import hashlib
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    rt = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if rt:
        rt.revoked = True
        db.commit()
        return True
    return False


def get_user_default_org(db: Session, user_id: uuid.UUID) -> uuid.UUID | None:
    """Get the user's default organization ID."""
    membership = db.query(OrgMembership).filter(
        OrgMembership.user_id == user_id,
        OrgMembership.is_default.is_(True),
    ).first()
    if membership:
        return membership.org_id

    # Fall back to first membership
    membership = db.query(OrgMembership).filter(
        OrgMembership.user_id == user_id,
    ).first()
    return membership.org_id if membership else None


def _generate_slug(name: str) -> str:
    """Generate a URL-safe slug from a name."""
    import re
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug or f"org-{uuid.uuid4().hex[:8]}"
