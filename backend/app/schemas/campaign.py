"""Campaign schemas."""
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CampaignCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = ""
    start_date: date | None = None
    end_date: date | None = None
    tags: list[str] = Field(default_factory=list)


class CampaignUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = None
    status: str | None = Field(default=None, pattern=r"^(active|paused|archived)$")
    start_date: date | None = None
    end_date: date | None = None
    tags: list[str] | None = None


class CampaignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    name: str
    slug: str
    description: str = ""
    status: str = "active"
    start_date: date | None = None
    end_date: date | None = None
    tags: list[str] = Field(default_factory=list)
    created_by: UUID | None = None
    created_at: datetime
    updated_at: datetime

    # Computed
    link_count: int = 0
    total_clicks: int = 0


class CampaignStats(BaseModel):
    total_links: int = 0
    total_clicks: int = 0
    unique_clicks: int = 0
    top_links: list[dict] = Field(default_factory=list)
    daily_clicks: list[dict] = Field(default_factory=list)
