"""Targeting router: smart-redirect routing rules and A/B tests for a link."""
from __future__ import annotations

import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from fastapi import Request

from ..deps import CurrentUser, get_db, require_role
from ..models.link import Link
from ..models.targeting import ABTest, ABVariant, DeepLinkConfig, RoutingRule
from ..schemas.common import DeleteResponse
from ..schemas.targeting import (
    ABTestCreate, ABTestOut, ABTestResults, ABTestUpdate, ABVariantResult,
    DeclareWinnerRequest, DeepLinkConfigOut, DeepLinkConfigUpsert,
    DeferredDeepLinkOut, RoutingRuleCreate, RoutingRuleOut, RoutingRuleUpdate,
)
from ..services.ab_testing import variant_click_counts
from ..services.deep_link import device_fingerprint
from ..services.smart_redirect import merge_link_utms

router = APIRouter(tags=["targeting"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _get_link(db: Session, link_id: UUID, org_id: UUID) -> Link:
    link = db.query(Link).filter(Link.id == link_id, Link.org_id == org_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found.")
    return link


def _get_rule(db: Session, rule_id: UUID, org_id: UUID) -> RoutingRule:
    rule = db.query(RoutingRule).filter(
        RoutingRule.id == rule_id, RoutingRule.org_id == org_id,
    ).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Routing rule not found.")
    return rule


def _get_test(db: Session, test_id: UUID, org_id: UUID) -> ABTest:
    test = db.query(ABTest).filter(
        ABTest.id == test_id, ABTest.org_id == org_id,
    ).first()
    if not test:
        raise HTTPException(status_code=404, detail="A/B test not found.")
    return test


# ── Smart-redirect routing rules ──────────────────────────────────────────────

@router.get("/links/{link_id}/rules", response_model=list[RoutingRuleOut])
def list_rules(
    link_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("viewer")),
):
    """List a link's routing rules, ordered by evaluation priority."""
    org_id = user.require_org()
    _get_link(db, link_id, org_id)
    rules = (
        db.query(RoutingRule)
        .filter(RoutingRule.link_id == link_id)
        .order_by(RoutingRule.priority.asc(), RoutingRule.created_at.asc())
        .all()
    )
    return [RoutingRuleOut.model_validate(r) for r in rules]


@router.post("/links/{link_id}/rules", response_model=RoutingRuleOut, status_code=status.HTTP_201_CREATED)
def create_rule(
    link_id: UUID,
    req: RoutingRuleCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("marketing_manager")),
):
    """Create a smart-redirect rule for a link."""
    org_id = user.require_org()
    _get_link(db, link_id, org_id)
    rule = RoutingRule(
        org_id=org_id,
        link_id=link_id,
        name=req.name,
        priority=req.priority,
        is_active=req.is_active,
        conditions=[c.model_dump() for c in req.conditions],
        destination_url=req.destination_url,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return RoutingRuleOut.model_validate(rule)


@router.put("/rules/{rule_id}", response_model=RoutingRuleOut)
def update_rule(
    rule_id: UUID,
    req: RoutingRuleUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("marketing_manager")),
):
    """Update a routing rule."""
    org_id = user.require_org()
    rule = _get_rule(db, rule_id, org_id)
    data = req.model_dump(exclude_unset=True)
    if "conditions" in data and data["conditions"] is not None:
        data["conditions"] = [c.model_dump() if hasattr(c, "model_dump") else c
                              for c in req.conditions]
    for key, value in data.items():
        if value is not None:
            setattr(rule, key, value)
    db.commit()
    db.refresh(rule)
    return RoutingRuleOut.model_validate(rule)


@router.delete("/rules/{rule_id}", response_model=DeleteResponse)
def delete_rule(
    rule_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("marketing_manager")),
):
    """Delete a routing rule."""
    org_id = user.require_org()
    rule = _get_rule(db, rule_id, org_id)
    db.delete(rule)
    db.commit()
    return DeleteResponse(deleted=1)


# ── A/B testing ───────────────────────────────────────────────────────────────

@router.get("/links/{link_id}/ab-test", response_model=ABTestOut)
def get_ab_test(
    link_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("viewer")),
):
    """Get the A/B test attached to a link (404 if none)."""
    org_id = user.require_org()
    _get_link(db, link_id, org_id)
    test = db.query(ABTest).filter(ABTest.link_id == link_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="No A/B test for this link.")
    return ABTestOut.model_validate(test)


@router.post("/links/{link_id}/ab-test", response_model=ABTestOut, status_code=status.HTTP_201_CREATED)
def create_ab_test(
    link_id: UUID,
    req: ABTestCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("marketing_manager")),
):
    """Create an A/B test (with 2+ weighted variants) for a link."""
    org_id = user.require_org()
    _get_link(db, link_id, org_id)

    existing = db.query(ABTest).filter(ABTest.link_id == link_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This link already has an A/B test. Delete it first.",
        )

    test = ABTest(
        org_id=org_id,
        link_id=link_id,
        name=req.name,
        status=req.status,
        sticky=req.sticky,
    )
    db.add(test)
    db.flush()
    for v in req.variants:
        db.add(ABVariant(
            ab_test_id=test.id,
            name=v.name,
            destination_url=v.destination_url,
            weight=v.weight,
            is_control=v.is_control,
        ))
    db.commit()
    db.refresh(test)
    return ABTestOut.model_validate(test)


@router.put("/ab-tests/{test_id}", response_model=ABTestOut)
def update_ab_test(
    test_id: UUID,
    req: ABTestUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("marketing_manager")),
):
    """Update test name / sticky flag / status (pause, resume, complete)."""
    org_id = user.require_org()
    test = _get_test(db, test_id, org_id)
    for key, value in req.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(test, key, value)
    db.commit()
    db.refresh(test)
    return ABTestOut.model_validate(test)


@router.delete("/ab-tests/{test_id}", response_model=DeleteResponse)
def delete_ab_test(
    test_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("marketing_manager")),
):
    """Delete an A/B test and its variants."""
    org_id = user.require_org()
    test = _get_test(db, test_id, org_id)
    db.delete(test)
    db.commit()
    return DeleteResponse(deleted=1)


@router.get("/ab-tests/{test_id}/results", response_model=ABTestResults)
def ab_test_results(
    test_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("viewer")),
):
    """Per-variant click results, share of traffic, and the leading variant."""
    org_id = user.require_org()
    test = _get_test(db, test_id, org_id)

    counts = variant_click_counts(org_id, test.link_id)
    total_clicks = sum(c["total"] for c in counts.values())

    results: list[ABVariantResult] = []
    leading_id = None
    leading_unique = -1
    for v in test.variants:
        c = counts.get(str(v.id), {"total": 0, "unique": 0})
        share = (c["total"] / total_clicks * 100) if total_clicks else 0.0
        if c["unique"] > leading_unique:
            leading_unique = c["unique"]
            leading_id = v.id
        results.append(ABVariantResult(
            variant_id=v.id,
            name=v.name,
            destination_url=v.destination_url,
            weight=v.weight,
            is_control=v.is_control,
            total_clicks=c["total"],
            unique_clicks=c["unique"],
            share_pct=round(share, 2),
            is_winner=(test.winner_variant_id == v.id),
        ))

    return ABTestResults(
        test_id=test.id,
        status=test.status,
        total_clicks=total_clicks,
        variants=results,
        leading_variant_id=leading_id if total_clicks else None,
    )


@router.post("/ab-tests/{test_id}/declare-winner", response_model=ABTestOut)
def declare_winner(
    test_id: UUID,
    req: DeclareWinnerRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("marketing_manager")),
):
    """Mark a variant as the winner; optionally promote it to the link's
    primary destination and complete the test."""
    org_id = user.require_org()
    test = _get_test(db, test_id, org_id)

    winner = next((v for v in test.variants if v.id == req.variant_id), None)
    if winner is None:
        raise HTTPException(status_code=404, detail="Variant not part of this test.")

    test.winner_variant_id = winner.id
    if req.apply_to_link:
        link = _get_link(db, test.link_id, org_id)
        link.final_url = merge_link_utms(winner.destination_url, link)
        link.destination_url = winner.destination_url
        test.status = "completed"

    db.commit()
    db.refresh(test)
    return ABTestOut.model_validate(test)


# ── Smart deep linking ─────────────────────────────────────────────────────────

@router.get("/links/{link_id}/deeplink", response_model=DeepLinkConfigOut)
def get_deep_link(
    link_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("viewer")),
):
    """Get a link's deep-link configuration (404 if none)."""
    org_id = user.require_org()
    _get_link(db, link_id, org_id)
    config = db.query(DeepLinkConfig).filter(DeepLinkConfig.link_id == link_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="No deep-link config for this link.")
    return DeepLinkConfigOut.model_validate(config)


@router.put("/links/{link_id}/deeplink", response_model=DeepLinkConfigOut)
def upsert_deep_link(
    link_id: UUID,
    req: DeepLinkConfigUpsert,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("marketing_manager")),
):
    """Create or replace a link's deep-link configuration."""
    org_id = user.require_org()
    _get_link(db, link_id, org_id)

    config = db.query(DeepLinkConfig).filter(DeepLinkConfig.link_id == link_id).first()
    data = req.model_dump()
    if config:
        for key, value in data.items():
            setattr(config, key, value)
    else:
        config = DeepLinkConfig(org_id=org_id, link_id=link_id, **data)
        db.add(config)
    db.commit()
    db.refresh(config)
    return DeepLinkConfigOut.model_validate(config)


@router.delete("/links/{link_id}/deeplink", response_model=DeleteResponse)
def delete_deep_link(
    link_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("marketing_manager")),
):
    """Remove a link's deep-link configuration."""
    org_id = user.require_org()
    _get_link(db, link_id, org_id)
    config = db.query(DeepLinkConfig).filter(DeepLinkConfig.link_id == link_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="No deep-link config for this link.")
    db.delete(config)
    db.commit()
    return DeleteResponse(deleted=1)


@router.get("/deeplink/resolve", response_model=DeferredDeepLinkOut)
async def resolve_deferred_deep_link(request: Request):
    """Public endpoint a freshly-installed app calls to claim its deferred path.

    Matches the original click by a coarse device fingerprint (IP + OS + device)
    stored at click time. Degrades gracefully to ``found=false`` when Redis is
    unavailable or no match exists.
    """
    ip = request.client.host if request.client else "0.0.0.0"
    ua = request.headers.get("user-agent", "")
    fp = device_fingerprint(ip, ua)
    try:
        from ..redis import get_redis
        r = get_redis()
        raw = await r.get(f"deferred:{fp}")
        if not raw:
            return DeferredDeepLinkOut(found=False)
        await r.delete(f"deferred:{fp}")
        data = json.loads(raw)
        return DeferredDeepLinkOut(
            found=True,
            deep_link=data.get("deep_link", ""),
            short_code=data.get("short_code", ""),
        )
    except Exception:
        return DeferredDeepLinkOut(found=False)
