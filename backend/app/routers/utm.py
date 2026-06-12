"""Single-URL endpoints: generate, validate, campaign naming, AI assistant."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import UtmLink
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
    issues = validate_all(ValidateRequest(**req.model_dump(exclude={"override_existing_utms", "force"})))
    issues += check_governance(db, req)

    errors = [i for i in issues if i.level == "error"]
    if errors and not req.force:
        return GenerateResponse(final_url="", issues=issues, blocked=True)

    final_url = build_utm_url(req)
    issues = validate_all(
        ValidateRequest(**req.model_dump(exclude={"override_existing_utms", "force"})),
        final_url=final_url,
    ) + check_governance(db, req)

    link = UtmLink(
        base_url=req.base_url.strip(),
        final_url=final_url,
        utm_source=sanitize_value(req.utm_source),
        utm_medium=sanitize_value(req.utm_medium),
        utm_campaign=sanitize_value(req.utm_campaign),
        utm_content=sanitize_value(req.utm_content),
        utm_term=sanitize_value(req.utm_term),
        custom_params=req.custom_params or {},
        created_by=identity.user,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    audit(db, identity, "generate_utm", final_url)

    return GenerateResponse(final_url=final_url, issues=issues,
                            blocked=False, history_id=link.id)


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
