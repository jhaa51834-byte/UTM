"""Backward-compatible dependency layer.

Bridges the legacy Identity/header-based auth to the new JWT-based system.
Old routers (utm, bulk, history, templates, tools, governance) import
Identity, audit, get_identity from here.
"""
from __future__ import annotations

import uuid
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from ..database import SyncSessionLocal
from ..models.audit import AuditLog


class Identity:
    """Lightweight identity object used by legacy routers."""
    def __init__(self, user: str, role: str, org_id: str | None = None):
        self.user = user
        self.role = role
        self.org_id = org_id


def get_identity(
    x_user: str = Header(default="anonymous"),
    x_role: str = Header(default="member"),
    x_org_id: str = Header(default=""),
) -> Identity:
    """Extract identity from request headers.

    In production, these headers are set by the reverse proxy / OAuth layer,
    or by the JWT auth middleware.
    """
    return Identity(
        user=x_user[:120],
        role=x_role[:64],
        org_id=x_org_id if x_org_id else None,
    )


def require_admin(identity: Identity) -> None:
    if identity.role not in ("admin", "org_admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin role required.")


def audit(db: Session, identity: Identity, action: str, detail: str = "") -> None:
    """Write an audit log entry."""
    org_id = None
    if identity.org_id:
        try:
            org_id = uuid.UUID(identity.org_id)
        except ValueError:
            pass

    entry = AuditLog(
        org_id=org_id or uuid.UUID(int=0),  # Fallback to nil UUID if no org
        actor_email=identity.user,
        role=identity.role,
        action=action,
        detail={"message": detail[:2000]} if detail else {},
    )
    db.add(entry)
    db.commit()
