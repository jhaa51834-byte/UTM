"""Analytics router: dashboard data endpoints."""
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from ..deps import RequireAnalyst
from ..schemas.analytics import (
    CampaignPerformance, DeviceResponse, GeoResponse, OverviewStats,
    ReferrerData, SourcePerformance, TimeseriesPoint,
)
from ..services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=OverviewStats)
def overview(
    user: RequireAnalyst,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
):
    """Dashboard overview: total clicks, uniques, change %, top campaigns."""
    org_id = user.require_org()
    return analytics_service.get_overview(org_id, start_date, end_date)


@router.get("/clicks", response_model=list[TimeseriesPoint])
def clicks_timeseries(
    user: RequireAnalyst,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    granularity: str = Query(default="day", regex="^(hour|day|week|month)$"),
    link_id: UUID | None = Query(default=None),
):
    """Click timeseries (hour/day/week/month granularity)."""
    org_id = user.require_org()
    return analytics_service.get_timeseries(org_id, start_date, end_date, granularity, link_id)


@router.get("/geo", response_model=GeoResponse)
def geo_breakdown(
    user: RequireAnalyst,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
):
    """Geographic click breakdown by country and city."""
    org_id = user.require_org()
    return analytics_service.get_geo_breakdown(org_id, start_date, end_date)


@router.get("/devices", response_model=DeviceResponse)
def device_breakdown(
    user: RequireAnalyst,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
):
    """Device, browser, and OS breakdown."""
    org_id = user.require_org()
    return analytics_service.get_device_breakdown(org_id, start_date, end_date)


@router.get("/campaigns", response_model=list[CampaignPerformance])
def campaign_performance(
    user: RequireAnalyst,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
):
    """Campaign performance breakdown."""
    org_id = user.require_org()
    return analytics_service.get_campaign_performance(org_id, start_date, end_date)


@router.get("/sources", response_model=list[SourcePerformance])
def source_performance(
    user: RequireAnalyst,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
):
    """UTM source performance."""
    org_id = user.require_org()
    return analytics_service.get_source_performance(org_id, start_date, end_date)


@router.get("/referrers", response_model=list[ReferrerData])
def referrer_breakdown(
    user: RequireAnalyst,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
):
    """Referrer domain breakdown."""
    org_id = user.require_org()
    return analytics_service.get_referrer_breakdown(org_id, start_date, end_date)
