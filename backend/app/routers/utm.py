"""Single-URL endpoints: generate, validate, campaign naming, AI assistant.

Updated for TrackFlow SaaS — generates UTM URLs with optional short link creation.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Link
from ..schemas import (AiSuggestRequest, AiSuggestResponse, CampaignNameRequest,
                       CampaignNameResponse, GenerateRequest, GenerateResponse,
                       ValidateRequest, ValidateResponse)
from ..services import ai_assistant
from ..services.campaign_namer import generate_campaign_name
from ..services.governance import check_governance
from ..services.utm_builder import build_utm_url, sanitize_value
from ..services.validator import validate_all
from .deps import Identity, audit, get_identity

router = APIRouter(tags=["utm"])


@router.post("/generate-utm", response_model=GenerateResponse)
def generate_utm(
    req: GenerateRequest,
    db: Session = Depends(get_db),
    identity: Identity = Depends(get_identity),
):
    issues = validate_all(ValidateRequest(**req.model_dump(
        exclude={"override_existing_utms", "force", "create_short_link",
                 "custom_alias", "campaign_id", "domain_id", "title", "tags"}
    )))
    issues += check_governance(db, req)

    errors = [i for i in issues if i.level == "error"]
    if errors and not req.force:
        return GenerateResponse(final_url="", issues=issues, blocked=True)

    final_url = build_utm_url(req)

    # Create short link if requested
    short_url = ""
    short_code = ""
    link_id = None

    if req.create_short_link:
        try:
            from ..services.link_service import generate_short_code, build_short_url, create_link
            import uuid

            org_id = uuid.UUID(identity.org_id) if identity.org_id else uuid.UUID(int=0)
            sc = generate_short_code(db, req.custom_alias)
            link = create_link(
                db=db,
                org_id=org_id,
                user_id=None,
                destination_url=req.base_url.strip(),
                final_url=final_url,
                short_code=sc,
                domain_id=uuid.UUID(req.domain_id) if req.domain_id else None,
                campaign_id=uuid.UUID(req.campaign_id) if req.campaign_id else None,
                title=req.title,
                utm_source=sanitize_value(req.utm_source),
                utm_medium=sanitize_value(req.utm_medium),
                utm_campaign=sanitize_value(req.utm_campaign),
                utm_content=sanitize_value(req.utm_content),
                utm_term=sanitize_value(req.utm_term),
                custom_params=req.custom_params or {},
                tags=req.tags or [],
            )
            short_code = sc
            short_url = build_short_url(sc)
            link_id = str(link.id)
        except Exception:
            pass  # Short link creation is optional

    audit(db, identity, "generate_utm", final_url)

    return GenerateResponse(
        final_url=final_url,
        short_url=short_url,
        short_code=short_code,
        link_id=link_id,
        issues=issues,
        blocked=False,
    )


@router.post("/validate", response_model=ValidateResponse)
def validate(
    req: ValidateRequest,
    db: Session = Depends(get_db),
):
    issues = validate_all(req) + check_governance(db, req)
    valid = not any(i.level == "error" for i in issues)
    return ValidateResponse(valid=valid, issues=issues)


@router.post("/campaign-name", response_model=CampaignNameResponse)
def campaign_name(req: CampaignNameRequest):
    return CampaignNameResponse(campaign_name=generate_campaign_name(req.parts))


@router.post("/ai-suggest", response_model=AiSuggestResponse)
def ai_suggest(req: AiSuggestRequest):
    return ai_assistant.suggest(req.description)
