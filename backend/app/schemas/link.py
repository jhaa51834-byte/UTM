"""Link schemas."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LinkCreate(BaseModel):
    """Create a new short link with optional UTM parameters."""
    destination_url: str = Field(min_length=1)
    custom_alias: str | None = Field(default=None, max_length=32, pattern=r"^[a-zA-Z0-9_-]+$")
    title: str = ""
    campaign_id: UUID | None = None
    domain_id: UUID | None = None
    team_id: UUID | None = None

    # UTM parameters
    utm_source: str = ""
    utm_medium: str = ""
    utm_campaign: str = ""
    utm_content: str = ""
    utm_term: str = ""
    custom_params: dict[str, str] = Field(default_factory=dict)

    # Link settings
    password: str | None = None
    expires_at: datetime | None = None
    max_clicks: int | None = None
    tags: list[str] = Field(default_factory=list)


class LinkUpdate(BaseModel):
    """Update an existing link."""
    title: str | None = None
    destination_url: str | None = None
    campaign_id: UUID | None = None
    is_active: bool | None = None
    password: str | None = None
    expires_at: datetime | None = None
    max_clicks: int | None = None
    tags: list[str] | None = None


class LinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    team_id: UUID | None = None
    campaign_id: UUID | None = None
    domain_id: UUID | None = None
    created_by: UUID | None = None

    destination_url: str
    short_code: str
    short_url: str = ""  # Computed field: domain + short_code
    final_url: str

    utm_source: str = ""
    utm_medium: str = ""
    utm_campaign: str = ""
    utm_content: str = ""
    utm_term: str = ""
    custom_params: dict = Field(default_factory=dict)

    title: str = ""
    is_active: bool = True
    has_password: bool = False
    expires_at: datetime | None = None
    max_clicks: int | None = None
    click_count: int = 0
    tags: list[str] = Field(default_factory=list)

    created_at: datetime
    updated_at: datetime


class LinkStats(BaseModel):
    """Summary statistics for a link."""
    total_clicks: int = 0
    unique_clicks: int = 0
    qr_scans: int = 0
    last_click_at: datetime | None = None
    top_countries: list[dict] = Field(default_factory=list)
    top_referrers: list[dict] = Field(default_factory=list)


class LinkToggle(BaseModel):
    is_active: bool
