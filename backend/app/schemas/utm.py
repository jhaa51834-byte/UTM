"""UTM generation and validation schemas."""
from typing import Optional

from pydantic import BaseModel, Field


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
    force: bool = False  # Generate even when governance errors exist
    create_short_link: bool = True  # Also create a short link
    custom_alias: str | None = None
    campaign_id: str | None = None
    domain_id: str | None = None
    title: str = ""
    tags: list[str] = Field(default_factory=list)


class ValidationIssue(BaseModel):
    level: str  # "error" | "warning" | "info"
    code: str
    message: str
    field: str = ""


class GenerateResponse(BaseModel):
    final_url: str = ""
    short_url: str = ""
    short_code: str = ""
    link_id: str | None = None
    issues: list[ValidationIssue] = Field(default_factory=list)
    blocked: bool = False


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
    engine: str = "rules"  # "rules" | "claude" | "openai"
    needs_approval: bool = True
