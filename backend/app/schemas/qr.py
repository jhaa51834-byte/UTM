"""QR code schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class QRCreate(BaseModel):
    link_id: UUID | None = None
    target_url: str = ""  # If no link_id, must provide URL
    name: str = ""
    format: str = Field(default="png", pattern=r"^(png|svg|pdf)$")
    style: dict = Field(default_factory=dict)  # {color, bg_color, logo_url, shape}


class QROut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    link_id: UUID | None = None
    name: str = ""
    target_url: str
    format: str
    style: dict = Field(default_factory=dict)
    scan_count: int = 0
    created_at: datetime


class QRStats(BaseModel):
    total_scans: int = 0
    unique_scans: int = 0
    daily_scans: list[dict] = Field(default_factory=list)
