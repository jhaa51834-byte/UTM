"""Analytics service: ClickHouse queries for dashboard data."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

from ..schemas.analytics import (
    BrowserData, CampaignPerformance, DeviceData, DeviceResponse,
    GeoData, GeoResponse, MediumPerformance, OSData, OverviewStats,
    ReferrerData, SourcePerformance, TimeseriesPoint,
)


def _date_range(start: date | None, end: date | None) -> tuple[date, date]:
    """Default to last 30 days if not provided."""
    end_date = end or date.today()
    start_date = start or (end_date - timedelta(days=30))
    return start_date, end_date


def get_overview(
    org_id: uuid.UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> OverviewStats:
    """Get overview statistics for the dashboard."""
    from ..clickhouse import query
    sd, ed = _date_range(start_date, end_date)
    prev_sd = sd - (ed - sd)

    # Current period
    rows = query(
        """
        SELECT
            count() AS total_clicks,
            sumIf(1, is_unique = 1) AS unique_clicks,
            sumIf(1, is_qr_scan = 1) AS qr_scans
        FROM clicks
        WHERE org_id = %(org_id)s
          AND click_date >= %(start)s AND click_date <= %(end)s
        """,
        {"org_id": str(org_id), "start": str(sd), "end": str(ed)},
    )
    current = rows[0] if rows else {}

    # Previous period for comparison
    prev_rows = query(
        """
        SELECT count() AS total_clicks
        FROM clicks
        WHERE org_id = %(org_id)s
          AND click_date >= %(start)s AND click_date < %(end)s
        """,
        {"org_id": str(org_id), "start": str(prev_sd), "end": str(sd)},
    )
    prev_clicks = prev_rows[0].get("total_clicks", 0) if prev_rows else 0
    cur_clicks = current.get("total_clicks", 0)

    change_pct = 0.0
    if prev_clicks > 0:
        change_pct = round(((cur_clicks - prev_clicks) / prev_clicks) * 100, 1)

    # Top campaigns
    top_campaigns = query(
        """
        SELECT utm_campaign, count() AS clicks
        FROM clicks
        WHERE org_id = %(org_id)s
          AND click_date >= %(start)s AND click_date <= %(end)s
          AND utm_campaign != ''
        GROUP BY utm_campaign
        ORDER BY clicks DESC
        LIMIT 10
        """,
        {"org_id": str(org_id), "start": str(sd), "end": str(ed)},
    )

    return OverviewStats(
        total_clicks=cur_clicks,
        unique_clicks=current.get("unique_clicks", 0),
        qr_scans=current.get("qr_scans", 0),
        clicks_change_pct=change_pct,
        top_campaigns=[{"name": r["utm_campaign"], "clicks": r["clicks"]} for r in top_campaigns],
    )


def get_timeseries(
    org_id: uuid.UUID,
    start_date: date | None = None,
    end_date: date | None = None,
    granularity: str = "day",
    link_id: uuid.UUID | None = None,
) -> list[TimeseriesPoint]:
    """Get click timeseries data."""
    from ..clickhouse import query
    sd, ed = _date_range(start_date, end_date)

    if granularity == "hour":
        time_expr = "toStartOfHour(clicked_at)"
    elif granularity == "week":
        time_expr = "toStartOfWeek(click_date)"
    elif granularity == "month":
        time_expr = "toStartOfMonth(click_date)"
    else:
        time_expr = "click_date"

    link_filter = "AND link_id = %(link_id)s" if link_id else ""
    params = {"org_id": str(org_id), "start": str(sd), "end": str(ed)}
    if link_id:
        params["link_id"] = str(link_id)

    rows = query(
        f"""
        SELECT
            {time_expr} AS ts,
            count() AS total_clicks,
            sumIf(1, is_unique = 1) AS unique_clicks
        FROM clicks
        WHERE org_id = %(org_id)s
          AND click_date >= %(start)s AND click_date <= %(end)s
          {link_filter}
        GROUP BY ts
        ORDER BY ts
        """,
        params,
    )

    return [
        TimeseriesPoint(
            timestamp=str(r["ts"]),
            total_clicks=r["total_clicks"],
            unique_clicks=r["unique_clicks"],
        )
        for r in rows
    ]


def get_geo_breakdown(
    org_id: uuid.UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> GeoResponse:
    """Get geographic click breakdown."""
    from ..clickhouse import query
    sd, ed = _date_range(start_date, end_date)
    params = {"org_id": str(org_id), "start": str(sd), "end": str(ed)}

    countries = query(
        """
        SELECT country, country_code, count() AS clicks,
               sumIf(1, is_unique = 1) AS unique_clicks
        FROM clicks
        WHERE org_id = %(org_id)s
          AND click_date >= %(start)s AND click_date <= %(end)s
          AND country != ''
        GROUP BY country, country_code
        ORDER BY clicks DESC
        LIMIT 50
        """,
        params,
    )

    total = sum(r["clicks"] for r in countries) or 1
    geo_data = [
        GeoData(
            country=r["country"],
            country_code=r["country_code"],
            clicks=r["clicks"],
            unique_clicks=r["unique_clicks"],
            percentage=round(r["clicks"] / total * 100, 1),
        )
        for r in countries
    ]

    cities = query(
        """
        SELECT city, country_code, count() AS clicks
        FROM clicks
        WHERE org_id = %(org_id)s
          AND click_date >= %(start)s AND click_date <= %(end)s
          AND city != ''
        GROUP BY city, country_code
        ORDER BY clicks DESC
        LIMIT 30
        """,
        params,
    )

    return GeoResponse(
        countries=geo_data,
        cities=[{"city": r["city"], "country_code": r["country_code"], "clicks": r["clicks"]} for r in cities],
    )


def get_device_breakdown(
    org_id: uuid.UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> DeviceResponse:
    """Get device, browser, and OS breakdown."""
    from ..clickhouse import query
    sd, ed = _date_range(start_date, end_date)
    params = {"org_id": str(org_id), "start": str(sd), "end": str(ed)}

    devices = query(
        """
        SELECT device_type, count() AS clicks
        FROM clicks
        WHERE org_id = %(org_id)s
          AND click_date >= %(start)s AND click_date <= %(end)s
          AND device_type != '' AND device_type != 'bot'
        GROUP BY device_type
        ORDER BY clicks DESC
        """,
        params,
    )
    total_d = sum(r["clicks"] for r in devices) or 1

    browsers = query(
        """
        SELECT browser, count() AS clicks
        FROM clicks
        WHERE org_id = %(org_id)s
          AND click_date >= %(start)s AND click_date <= %(end)s
          AND browser != '' AND browser != 'Bot' AND browser != 'Unknown'
        GROUP BY browser
        ORDER BY clicks DESC
        LIMIT 10
        """,
        params,
    )
    total_b = sum(r["clicks"] for r in browsers) or 1

    oses = query(
        """
        SELECT os, count() AS clicks
        FROM clicks
        WHERE org_id = %(org_id)s
          AND click_date >= %(start)s AND click_date <= %(end)s
          AND os != '' AND os != 'Unknown'
        GROUP BY os
        ORDER BY clicks DESC
        LIMIT 10
        """,
        params,
    )
    total_o = sum(r["clicks"] for r in oses) or 1

    return DeviceResponse(
        devices=[DeviceData(device_type=r["device_type"], clicks=r["clicks"], percentage=round(r["clicks"]/total_d*100, 1)) for r in devices],
        browsers=[BrowserData(browser=r["browser"], clicks=r["clicks"], percentage=round(r["clicks"]/total_b*100, 1)) for r in browsers],
        operating_systems=[OSData(os=r["os"], clicks=r["clicks"], percentage=round(r["clicks"]/total_o*100, 1)) for r in oses],
    )


def get_campaign_performance(
    org_id: uuid.UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[CampaignPerformance]:
    """Get campaign performance breakdown."""
    from ..clickhouse import query
    sd, ed = _date_range(start_date, end_date)
    params = {"org_id": str(org_id), "start": str(sd), "end": str(ed)}

    rows = query(
        """
        SELECT utm_campaign, count() AS total_clicks,
               sumIf(1, is_unique = 1) AS unique_clicks,
               uniqExact(link_id) AS link_count
        FROM clicks
        WHERE org_id = %(org_id)s
          AND click_date >= %(start)s AND click_date <= %(end)s
          AND utm_campaign != ''
        GROUP BY utm_campaign
        ORDER BY total_clicks DESC
        LIMIT 20
        """,
        params,
    )

    return [
        CampaignPerformance(
            campaign_id="",
            campaign_name=r["utm_campaign"],
            total_clicks=r["total_clicks"],
            unique_clicks=r["unique_clicks"],
            link_count=r["link_count"],
        )
        for r in rows
    ]


def get_source_performance(
    org_id: uuid.UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[SourcePerformance]:
    """Get UTM source performance."""
    from ..clickhouse import query
    sd, ed = _date_range(start_date, end_date)

    rows = query(
        """
        SELECT utm_source, count() AS total_clicks,
               sumIf(1, is_unique = 1) AS unique_clicks
        FROM clicks
        WHERE org_id = %(org_id)s
          AND click_date >= %(start)s AND click_date <= %(end)s
          AND utm_source != ''
        GROUP BY utm_source
        ORDER BY total_clicks DESC
        LIMIT 20
        """,
        {"org_id": str(org_id), "start": str(sd), "end": str(ed)},
    )
    return [SourcePerformance(**r) for r in rows]


def get_referrer_breakdown(
    org_id: uuid.UUID,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[ReferrerData]:
    """Get referrer domain breakdown."""
    from ..clickhouse import query
    sd, ed = _date_range(start_date, end_date)

    rows = query(
        """
        SELECT referrer_domain, count() AS clicks
        FROM clicks
        WHERE org_id = %(org_id)s
          AND click_date >= %(start)s AND click_date <= %(end)s
          AND referrer_domain != ''
        GROUP BY referrer_domain
        ORDER BY clicks DESC
        LIMIT 20
        """,
        {"org_id": str(org_id), "start": str(sd), "end": str(ed)},
    )
    total = sum(r["clicks"] for r in rows) or 1
    return [
        ReferrerData(
            referrer_domain=r["referrer_domain"],
            clicks=r["clicks"],
            percentage=round(r["clicks"] / total * 100, 1),
        )
        for r in rows
    ]
