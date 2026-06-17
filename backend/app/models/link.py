"""Link (URL shortener) and LinkTag models."""
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base
from .base import ARRAY, PG_UUID, TimestampMixin, UUIDMixin, utcnow


class Link(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "links"
    __table_args__ = (
        Index("idx_links_org", "org_id"),
        Index("idx_links_campaign", "campaign_id"),
        Index("idx_links_short_code", "short_code", unique=True),
        Index("idx_links_created_at", "created_at"),
        Index("idx_links_domain", "domain_id"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False,
    )
    team_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True,
    )
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True,
    )
    domain_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("custom_domains.id", ondelete="SET NULL"), nullable=True,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )

    # URL data
    destination_url: Mapped[str] = mapped_column(Text, nullable=False)
    short_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    final_url: Mapped[str] = mapped_column(Text, nullable=False)

    # UTM parameters
    utm_source: Mapped[str] = mapped_column(String(255), default="")
    utm_medium: Mapped[str] = mapped_column(String(255), default="")
    utm_campaign: Mapped[str] = mapped_column(String(255), default="")
    utm_content: Mapped[str] = mapped_column(String(255), default="")
    utm_term: Mapped[str] = mapped_column(String(255), default="")
    custom_params: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Link settings
    title: Mapped[str] = mapped_column(String(255), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    max_clicks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    click_count: Mapped[int] = mapped_column(BigInteger, default=0)

    # Metadata
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)

    # Relationships
    organization = relationship("Organization", back_populates="links")
    campaign = relationship("Campaign", back_populates="links")
    domain = relationship("CustomDomain", back_populates="links")
    creator = relationship("User", foreign_keys=[created_by])
    qr_codes = relationship("QRCode", back_populates="link")


class LinkTag(Base):
    __tablename__ = "link_tags"

    link_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("links.id", ondelete="CASCADE"), primary_key=True,
    )
    tag: Mapped[str] = mapped_column(String(100), primary_key=True)
