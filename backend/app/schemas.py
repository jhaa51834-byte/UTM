from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

UTM_FIELDS = ("utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term")


class UtmParams(BaseModel):
    utm_source: str = ""
    utm_medium: str = ""
    utm_campaign: str = ""
    utm_content: str = ""
    utm_term: str = ""
    custom_params: dict[str, str] = Field(default_factory=dict)


class GenerateRequest(UtmParams):
    base_url: str
    override_existing_utms: bool = True
    force: bool = False  # generate even when governance/validation errors exist


class ValidationIssue(BaseModel):
    level: str  # "error" | "warning" | "info"
    code: str
    message: str
    field: str = ""


class GenerateResponse(BaseModel):
    final_url: str = ""
    issues: list[ValidationIssue] = Field(default_factory=list)
    blocked: bool = False
    history_id: Optional[int] = None


class ValidateRequest(UtmParams):
    base_url: str = ""


class ValidateResponse(BaseModel):
    valid: bool
    issues: list[ValidationIssue] = Field(default_factory=list)


class CampaignNameRequest(BaseModel):
    parts: list[str]


class CampaignNameResponse(BaseModel):
    campaign_name: str


class AiSuggestRequest(BaseModel):
    description: str


class AiSuggestResponse(BaseModel):
    utm_source: str = ""
    utm_medium: str = ""
    utm_campaign: str = ""
    utm_content: str = ""
    utm_term: str = ""
    rationale: str = ""
    engine: str = "rules"  # "rules" | "claude"
    needs_approval: bool = True


class TemplateIn(BaseModel):
    name: str
    description: str = ""
    utm_source: str = ""
    utm_medium: str = ""
    utm_campaign: str = ""
    utm_content: str = ""
    utm_term: str = ""
    custom_params: dict[str, str] = Field(default_factory=dict)


class TemplateOut(TemplateIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by: str
    created_at: datetime


class HistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    base_url: str
    final_url: str
    short_url: str
    utm_source: str
    utm_medium: str
    utm_campaign: str
    utm_content: str
    utm_term: str
    custom_params: dict[str, str]
    created_by: str
    created_at: datetime


class GovernanceRuleIn(BaseModel):
    name: str
    match_field: str
    match_value: str
    required_field: str
    allowed_values: list[str]
    severity: str = "error"
    active: bool = True


class GovernanceRuleOut(GovernanceRuleIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_by: str
    created_at: datetime


class ShortenRequest(BaseModel):
    url: str
    provider: str = "tinyurl"  # "tinyurl" | "bitly"
    history_id: Optional[int] = None


class ShortenResponse(BaseModel):
    short_url: str
    provider: str


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor: str
    role: str
    action: str
    detail: str
    created_at: datetime
