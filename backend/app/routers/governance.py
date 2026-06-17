"""Admin-managed governance rules."""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import GovernanceRule
from ..schemas.governance import GovernanceRuleIn
from .deps import Identity, audit, get_identity, require_admin

router = APIRouter(tags=["governance"])

_VALID_FIELDS = {"utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"}


def _to_dict(rule: GovernanceRule) -> dict:
    return {
        "id": str(rule.id),
        "name": rule.name,
        "match_field": rule.match_field,
        "match_value": rule.match_value,
        "required_field": rule.required_field,
        "allowed_values": rule.allowed_values,
        "severity": rule.severity,
        "is_active": rule.is_active,
        "created_by": str(rule.created_by) if rule.created_by else None,
        "created_at": rule.created_at.isoformat() if rule.created_at else None,
    }


@router.get("/governance-rules")
def list_rules(db: Session = Depends(get_db)):
    return [_to_dict(r) for r in db.query(GovernanceRule).order_by(GovernanceRule.name).all()]


@router.post("/governance-rules")
def create_rule(
    req: GovernanceRuleIn,
    db: Session = Depends(get_db),
    identity: Identity = Depends(get_identity),
):
    require_admin(identity)
    if req.match_field not in _VALID_FIELDS or req.required_field not in _VALID_FIELDS:
        raise HTTPException(status_code=400,
                            detail=f"Fields must be one of {sorted(_VALID_FIELDS)}.")

    org_id = uuid.UUID(identity.org_id) if identity.org_id else uuid.UUID(int=0)
    rule = GovernanceRule(
        org_id=org_id,
        name=req.name.strip(),
        match_field=req.match_field,
        match_value=req.match_value.strip().lower(),
        required_field=req.required_field,
        allowed_values=",".join(v.strip().lower() for v in req.allowed_values if v.strip()),
        severity=req.severity,
        is_active=req.is_active,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    audit(db, identity, "create_governance_rule", rule.name)
    return _to_dict(rule)


@router.delete("/governance-rules/{rule_id}")
def delete_rule(
    rule_id: str,
    db: Session = Depends(get_db),
    identity: Identity = Depends(get_identity),
):
    require_admin(identity)
    try:
        uid = uuid.UUID(rule_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID.")
    rule = db.query(GovernanceRule).filter(GovernanceRule.id == uid).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found.")
    db.delete(rule)
    db.commit()
    audit(db, identity, "delete_governance_rule", rule.name)
    return {"deleted": 1}
