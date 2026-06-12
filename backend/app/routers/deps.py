"""Shared request dependencies.

Identity is taken from X-User / X-Role headers. In production these would be
populated by your SSO / reverse-proxy layer (e.g. OAuth2 proxy, Entra ID);
the API is deliberately header-based so it slots behind any identity provider.
"""
from fastapi import Header, HTTPException
from sqlalchemy.orm import Session

from ..models import AuditLog


class Identity:
    def __init__(self, user: str, role: str):
        self.user = user
        self.role = role


def get_identity(
    x_user: str = Header(default="anonymous"),
    x_role: str = Header(default="member"),
) -> Identity:
    return Identity(user=x_user[:120], role=x_role[:64])


def require_admin(identity: Identity) -> None:
    if identity.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required.")


def audit(db: Session, identity: Identity, action: str, detail: str = "") -> None:
    db.add(AuditLog(actor=identity.user, role=identity.role,
                    action=action, detail=detail[:2000]))
    db.commit()
