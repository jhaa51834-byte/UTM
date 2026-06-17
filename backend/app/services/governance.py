"""UTM governance: admin-defined combination rules.

A rule says: when <match_field> == <match_value>, then <required_field>
must be one of <allowed_values>. Severity "error" blocks generation
(unless force=True), "warning" only annotates.
"""
from sqlalchemy.orm import Session

from ..models import GovernanceRule
from ..schemas import UtmParams, ValidationIssue

DEFAULT_RULES = [
    dict(name="Google Ads must use cpc", match_field="utm_source",
         match_value="google", required_field="utm_medium",
         allowed_values="cpc,organic", severity="error"),
    dict(name="Email source must use email medium", match_field="utm_source",
         match_value="email", required_field="utm_medium",
         allowed_values="email", severity="error"),
    dict(name="LinkedIn must use paid_social or organic_social",
         match_field="utm_source", match_value="linkedin",
         required_field="utm_medium",
         allowed_values="paid_social,organic_social", severity="error"),
]


def seed_default_rules(db: Session, org_id=None) -> None:
    if not org_id:
        import uuid
        org_id = uuid.UUID(int=0)

    # Ensure default organization exists
    from ..models.organization import Organization
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        org = Organization(id=org_id, name="Default Organization", slug="default")
        db.add(org)
        db.commit()

    if db.query(GovernanceRule).filter(GovernanceRule.org_id == org_id).count() == 0:
        for rule in DEFAULT_RULES:
            r = rule.copy()
            r["org_id"] = org_id
            db.add(GovernanceRule(**r))
        db.commit()


def check_governance(db: Session, params: UtmParams) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    values = {
        "utm_source": (params.utm_source or "").strip().lower(),
        "utm_medium": (params.utm_medium or "").strip().lower(),
        "utm_campaign": (params.utm_campaign or "").strip().lower(),
        "utm_content": (params.utm_content or "").strip().lower(),
        "utm_term": (params.utm_term or "").strip().lower(),
    }
    rules = db.query(GovernanceRule).filter(GovernanceRule.is_active.is_(True)).all()
    for rule in rules:
        if values.get(rule.match_field, "") != rule.match_value.lower():
            continue
        allowed = [v.strip().lower() for v in rule.allowed_values.split(",") if v.strip()]
        actual = values.get(rule.required_field, "")
        if actual and actual not in allowed:
            issues.append(ValidationIssue(
                level=rule.severity,
                code="governance_violation",
                message=(f"Rule '{rule.name}': when {rule.match_field}="
                         f"{rule.match_value}, {rule.required_field} must be one of "
                         f"[{', '.join(allowed)}] (got '{actual}')."),
                field=rule.required_field,
            ))
    return issues

