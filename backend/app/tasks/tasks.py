"""Background tasks for bulk operations, analytics, and maintenance."""
from .celery_app import celery_app


@celery_app.task(name="process_bulk_upload")
def process_bulk_upload(job_id: str, rows: list[dict], org_id: str, user_id: str):
    """Process a bulk CSV upload in the background."""
    # TODO: Implement bulk processing with link creation
    pass


@celery_app.task(name="aggregate_daily_analytics")
def aggregate_daily_analytics():
    """Run daily analytics aggregation (ClickHouse materialized views handle most of this)."""
    pass


@celery_app.task(name="check_domain_health")
def check_domain_health_task():
    """Periodic domain health check for all verified domains."""
    pass


@celery_app.task(name="cleanup_expired_links")
def cleanup_expired_links():
    """Mark expired links as inactive."""
    pass


@celery_app.task(name="cleanup_expired_tokens")
def cleanup_expired_tokens():
    """Remove expired refresh tokens."""
    pass
