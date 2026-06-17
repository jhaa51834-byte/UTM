"""Custom domain model for branded short URLs."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base
from .base import PG_UUID, TimestampMixin, UUIDMixin, utcnow


class CustomDomain(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "custom_domains"

    org_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False,
    )
    domain: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    verification_token: Mapped[str] = mapped_column(String(64), nullable=False)
    verification_method: Mapped[str] = mapped_column(String(20), default="cname")  # cname, txt
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    ssl_status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, active, expired, error
    ssl_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    health_status: Mapped[str] = mapped_column(String(20), default="unknown")  # healthy, degraded, down, unknown
    last_health_check: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="domains")
    links = relationship("Link", back_populates="domain")
