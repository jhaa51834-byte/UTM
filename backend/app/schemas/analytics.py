"""Analytics query and response schemas."""
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AnalyticsQuery(BaseModel):
    """Common query parameters for analytics endpoints."""
    start_date: date | None = None
    end_date: date | None = None
    link_id: UUID | None = None
    campaign_id: UUID | None = None
    granularity: str = "day"  # hour, day, week, month


class OverviewStats(BaseModel):
    total_clicks: int = 0
    unique_clicks: int = 0
    active_links: int = 0
    total_links: int = 0
    total_campaigns: int = 0
    qr_scans: int = 0
    clicks_change_pct: float = 0.0  # vs previous period
    top_campaigns: list[dict] = Field(default_factory=list)
    top_links: list[dict] = Field(default_factory=list)


class TimeseriesPoint(BaseModel):
    timestamp: str  # ISO format
    total_clicks: int = 0
    unique_clicks: int = 0


class GeoData(BaseModel):
    country: str
    country_code: str
    clicks: int
    unique_clicks: int = 0
    percentage: float = 0.0


class GeoResponse(BaseModel):
    countries: list[GeoData] = Field(default_factory=list)
    regions: list[dict] = Field(default_factory=list)
    cities: list[dict] = Field(default_factory=list)


class DeviceData(BaseModel):
    device_type: str
    clicks: int
    percentage: float = 0.0


class BrowserData(BaseModel):
    browser: str
    clicks: int
    percentage: float = 0.0


class OSData(BaseModel):
    os: str
    clicks: int
    percentage: float = 0.0


class DeviceResponse(BaseModel):
    devices: list[DeviceData] = Field(default_factory=list)
    browsers: list[BrowserData] = Field(default_factory=list)
    operating_systems: list[OSData] = Field(default_factory=list)


class ReferrerData(BaseModel):
    referrer_domain: str
    clicks: int
    percentage: float = 0.0


class CampaignPerformance(BaseModel):
    campaign_id: str
    campaign_name: str
    total_clicks: int = 0
    unique_clicks: int = 0
    link_count: int = 0
    daily_clicks: list[TimeseriesPoint] = Field(default_factory=list)


class SourcePerformance(BaseModel):
    utm_source: str
    total_clicks: int = 0
    unique_clicks: int = 0


class MediumPerformance(BaseModel):
    utm_medium: str
    total_clicks: int = 0
    unique_clicks: int = 0


class RealtimeStats(BaseModel):
    """WebSocket real-time update payload."""
    clicks_last_minute: int = 0
    clicks_last_hour: int = 0
    active_visitors: int = 0
    recent_clicks: list[dict] = Field(default_factory=list)
