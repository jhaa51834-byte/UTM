"""Admin-managed governance rules."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import GovernanceRule
from ..schemas import GovernanceRuleIn, GovernanceRuleOut
from .deps import Identity, audit, get_identity, require_admin

router = APIRouter(tags=["governance"])

_VALID_FIELDS = {"utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"}


def _to_out(rule: GovernanceRule) -> GovernanceRuleOut:
    return GovernanceRuleOut(
        id=rule.id, name=rule.name, match_field=rule.match_field,
        match_value=rule.match_value, required_field=rule.required_field,
        allowed_values=[v.strip() for v in rule.allowed_values.split(",") if v.strip()],
        severity=rule.severity, active=rule.active,
        created_by=rule.created_by, created_at=rule.created_at)


@router.get("/governance-rules", response_model=list[GovernanceRuleOut])
def list_rules(db: Session = Depends(get_db)):
    return [_to_out(r) for r in db.query(GovernanceRule).order_by(GovernanceRule.id).all()]


@router.post("/governance-rules", response_model=GovernanceRuleOut)
def create_rule(
    req: GovernanceRuleIn,
    db: Session = Depends(get_db),
    identity: Identity = Depends(get_identity),
):
    require_admin(identity)
    if req.match_field not in _VALID_FIELDS or req.required_field not in _VALID_FIELDS:
        raise HTTPException(status_code=400,
                            detail=f"Fields must be one of {sorted(_VALID_FIELDS)}.")
    if req.severity not in ("error", "warning"):
        raise HTTPException(status_code=400, detail="Severity must be error or warning.")
    rule = GovernanceRule(
        name=req.name.strip(), match_field=req.match_field,
        match_value=req.match_value.strip().lower(),
        required_field=req.required_field,
        allowed_values=",".join(v.strip().lower() for v in req.allowed_values if v.strip()),
        severity=req.severity, active=req.active, created_by=identity.user)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    audit(db, identity, "create_governance_rule", rule.name)
    return _to_out(rule)


@router.delete("/governance-rules/{rule_id}")
def delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    identity: Identity = Depends(get_identity),
):
    require_admin(identity)
    rule = db.get(GovernanceRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found.")
    db.delete(rule)
    db.commit()
    audit(db, identity, "delete_governance_rule", rule.name)
    return {"deleted": rule_id}
