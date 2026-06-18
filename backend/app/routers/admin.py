"""Admin router: audit logs, platform stats, API key management."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..deps import CurrentUser, PaginationParams, get_db, require_role
from ..models.api_key import APIKey
from ..models.audit import AuditLog
from ..schemas.common import DeleteResponse, PaginatedResponse
from ..utils.hashing import generate_api_key, verify_api_key

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Audit Logs ───────────────────────────────────────────────────

@router.get("/audit-logs")
def list_audit_logs(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("org_admin")),
    pagination: PaginationParams = Depends(),
    action: str = Query(default=""),
):
    org_id = user.require_org()
    q = db.query(AuditLog).filter(AuditLog.org_id == org_id)
    if action:
        q = q.filter(AuditLog.action == action)
    total = q.count()
    items = q.order_by(AuditLog.created_at.desc()).offset(pagination.offset).limit(pagination.page_size).all()
    return {
        "items": [
            {
                "id": str(a.id),
                "actor_email": a.actor_email,
                "role": a.role,
                "action": a.action,
                "resource_type": a.resource_type,
                "detail": a.detail,
                "ip_address": a.ip_address,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in items
        ],
        "total": total,
        "page": pagination.page,
        "page_size": pagination.page_size,
    }


# ── API Keys ─────────────────────────────────────────────────────

@router.get("/api-keys")
def list_api_keys(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("org_admin")),
):
    org_id = user.require_org()
    keys = db.query(APIKey).filter(APIKey.org_id == org_id, APIKey.is_active.is_(True)).all()
    return [
        {
            "id": str(k.id),
            "name": k.name,
            "key_prefix": k.key_prefix,
            "scopes": k.scopes,
            "rate_limit": k.rate_limit,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "expires_at": k.expires_at.isoformat() if k.expires_at else None,
            "created_at": k.created_at.isoformat() if k.created_at else None,
        }
        for k in keys
    ]


@router.post("/api-keys", status_code=status.HTTP_201_CREATED)
def create_api_key_endpoint(
    name: str = Query(...),
    scopes: str = Query(default="read"),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("org_admin")),
):
    org_id = user.require_org()
    full_key, prefix, key_hash = generate_api_key()

    api_key = APIKey(
        org_id=org_id,
        user_id=user.id,
        name=name,
        key_prefix=prefix,
        key_hash=key_hash,
        scopes=[s.strip() for s in scopes.split(",")],
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    # Return the full key ONCE (it can never be retrieved again)
    return {
        "id": str(api_key.id),
        "name": name,
        "key": full_key,  # Only returned on creation
        "key_prefix": prefix,
        "scopes": api_key.scopes,
    }


@router.delete("/api-keys/{key_id}", response_model=DeleteResponse)
def revoke_api_key(
    key_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("org_admin")),
):
    org_id = user.require_org()
    key = db.query(APIKey).filter(APIKey.id == key_id, APIKey.org_id == org_id).first()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found.")
    key.is_active = False
    db.commit()
    return DeleteResponse(deleted=1)


# ── Platform Stats (Super Admin) ────────────────────────────────

@router.get("/stats")
def platform_stats(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("super_admin")),
):
    from ..models.organization import Organization
    from ..models.user import User
    from ..models.link import Link
    from sqlalchemy import func

    return {
        "total_users": db.query(func.count(User.id)).scalar(),
        "total_organizations": db.query(func.count(Organization.id)).scalar(),
        "total_links": db.query(func.count(Link.id)).scalar(),
        "total_clicks": db.query(func.coalesce(func.sum(Link.click_count), 0)).scalar(),
    }
