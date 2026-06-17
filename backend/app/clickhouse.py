"""ClickHouse client for analytics event storage and queries.

Uses clickhouse-connect for HTTP-based access to ClickHouse.
"""
from __future__ import annotations

from typing import Any

import clickhouse_connect
from clickhouse_connect.driver import Client

from .config import settings

_client: Client | None = None


def init_clickhouse() -> Client:
    """Initialise the ClickHouse client. Called once at startup."""
    global _client
    _client = clickhouse_connect.get_client(
        host=settings.clickhouse_host,
        port=settings.clickhouse_port,
        username=settings.clickhouse_user,
        password=settings.clickhouse_password,
        database=settings.clickhouse_database,
    )
    _ensure_schema()
    return _client


def get_clickhouse() -> Client:
    """Return the global ClickHouse client."""
    if _client is None:
        raise RuntimeError("ClickHouse not initialised — call init_clickhouse() first.")
    return _client


def close_clickhouse() -> None:
    """Close the ClickHouse client."""
    global _client
    if _client:
        _client.close()
    _client = None


def _ensure_schema() -> None:
    """Create ClickHouse tables and materialized views if they don't exist."""
    ch = get_clickhouse()

    ch.command(f"CREATE DATABASE IF NOT EXISTS {settings.clickhouse_database}")

    ch.command("""
    CREATE TABLE IF NOT EXISTS clicks (
        event_id        UUID DEFAULT generateUUIDv4(),
        link_id         UUID,
        org_id          UUID,
        short_code      String,

        clicked_at      DateTime64(3, 'UTC'),
        click_date      Date DEFAULT toDate(clicked_at),

        country         LowCardinality(String) DEFAULT '',
        country_code    LowCardinality(String) DEFAULT '',
        region          String DEFAULT '',
        city            String DEFAULT '',
        latitude        Float64 DEFAULT 0,
        longitude       Float64 DEFAULT 0,

        device_type     LowCardinality(String) DEFAULT '',
        browser         LowCardinality(String) DEFAULT '',
        browser_version String DEFAULT '',
        os              LowCardinality(String) DEFAULT '',
        os_version      String DEFAULT '',

        referrer        String DEFAULT '',
        referrer_domain LowCardinality(String) DEFAULT '',
        user_agent      String DEFAULT '',
        ip_hash         String DEFAULT '',

        utm_source      LowCardinality(String) DEFAULT '',
        utm_medium      LowCardinality(String) DEFAULT '',
        utm_campaign    LowCardinality(String) DEFAULT '',
        utm_content     String DEFAULT '',
        utm_term        String DEFAULT '',

        is_unique       UInt8 DEFAULT 1,
        is_bot          UInt8 DEFAULT 0,
        is_qr_scan      UInt8 DEFAULT 0
    )
    ENGINE = MergeTree()
    PARTITION BY toYYYYMM(click_date)
    ORDER BY (org_id, link_id, clicked_at)
    TTL click_date + INTERVAL 2 YEAR
    SETTINGS index_granularity = 8192
    """)

    ch.command("""
    CREATE MATERIALIZED VIEW IF NOT EXISTS clicks_daily_mv
    ENGINE = SummingMergeTree()
    PARTITION BY toYYYYMM(click_date)
    ORDER BY (org_id, link_id, click_date, country_code, device_type, browser,
              utm_source, utm_medium, utm_campaign)
    AS SELECT
        org_id, link_id, click_date,
        country_code, device_type, browser,
        utm_source, utm_medium, utm_campaign,
        count()                       AS total_clicks,
        sumIf(1, is_unique = 1)       AS unique_clicks,
        sumIf(1, is_qr_scan = 1)      AS qr_scans
    FROM clicks
    GROUP BY org_id, link_id, click_date, country_code, device_type, browser,
             utm_source, utm_medium, utm_campaign
    """)

    ch.command("""
    CREATE MATERIALIZED VIEW IF NOT EXISTS clicks_hourly_mv
    ENGINE = SummingMergeTree()
    PARTITION BY toYYYYMM(click_date)
    ORDER BY (org_id, hour)
    AS SELECT
        org_id,
        toStartOfHour(clicked_at)     AS hour,
        toDate(clicked_at)            AS click_date,
        count()                       AS total_clicks,
        sumIf(1, is_unique = 1)       AS unique_clicks
    FROM clicks
    GROUP BY org_id, hour, click_date
    """)


def insert_clicks(rows: list[dict[str, Any]]) -> None:
    """Batch-insert click events into ClickHouse."""
    if not rows:
        return
    ch = get_clickhouse()
    columns = list(rows[0].keys())
    data = [list(row.values()) for row in rows]
    ch.insert("clicks", data, column_names=columns)


def query(sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """Execute a query and return rows as dicts."""
    ch = get_clickhouse()
    result = ch.query(sql, parameters=params or {})
    columns = result.column_names
    return [dict(zip(columns, row)) for row in result.result_rows]
