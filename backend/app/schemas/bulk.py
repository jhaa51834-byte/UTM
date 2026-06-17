"""Bulk operation schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class BulkRow(BaseModel):
    url: str = ""
    source: str = ""
    medium: str = ""
    campaign: str = ""
    content: str = ""
    term: str = ""
    custom_params: dict[str, str] = Field(default_factory=dict)
    final_url: str = ""
    short_url: str = ""
    short_code: str = ""
    status: str = "pending"  # pending, ok, warning, error
    issues: str = ""
    link_id: str | None = None


class BulkJobCreate(BaseModel):
    domain_id: UUID | None = None
    campaign_id: UUID | None = None
    tags: list[str] = Field(default_factory=list)


class BulkJobOut(BaseModel):
    job_id: str
    status: str  # pending, processing, completed, failed
    total_rows: int = 0
    processed_rows: int = 0
    success_rows: int = 0
    error_rows: int = 0
    created_at: datetime | None = None


class BulkExportRequest(BaseModel):
    format: str = Field(default="csv", pattern=r"^(csv|xlsx|json)$")
    link_ids: list[UUID] | None = None
    campaign_id: UUID | None = None
    start_date: str | None = None
    end_date: str | None = None
