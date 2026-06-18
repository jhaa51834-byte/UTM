"""Smart-redirect routing rules and A/B testing models.

A Link can carry:
  * Many RoutingRules — evaluated by priority on every click; the first rule
    whose conditions all match overrides the destination (geo / device /
    language / time targeting).
  * One ABTest with two or more ABVariants — when no routing rule matches,
    traffic is split across the variants by weight.

Both are tenant-scoped (``org_id``) and cascade-deleted with their link.
"""
import uuid

from sqlalchemy import (
    Boolean, ForeignKey, Index, Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base
from .base import PG_UUID, TimestampMixin, UUIDMixin


class RoutingRule(Base, UUIDMixin, TimestampMixin):
    """A single smart-redirect rule attached to a link.

    ``conditions`` is a list of ``{"field", "operator", "value"}`` objects that
    are AND-ed together. The lowest ``priority`` value is evaluated first.
    """
    __tablename__ = "routing_rules"
    __table_args__ = (
        Index("idx_routing_rules_link", "link_id"),
        Index("idx_routing_rules_org", "org_id"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False,
    )
    link_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("links.id", ondelete="CASCADE"), nullable=False,
    )

    name: Mapped[str] = mapped_column(String(255), default="")
    priority: Mapped[int] = mapped_column(Integer, default=100)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # [{"field": "country_code", "operator": "in", "value": ["IN", "US"]}, ...]
    conditions: Mapped[list] = mapped_column(JSONB, default=list)
    destination_url: Mapped[str] = mapped_column(Text, nullable=False)

    link = relationship("Link", back_populates="routing_rules")


class ABTest(Base, UUIDMixin, TimestampMixin):
    """An A/B test attached to a link. One active test per link."""
    __tablename__ = "ab_tests"
    __table_args__ = (
        UniqueConstraint("link_id", name="uq_ab_tests_link"),
        Index("idx_ab_tests_org", "org_id"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False,
    )
    link_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("links.id", ondelete="CASCADE"), nullable=False,
    )

    name: Mapped[str] = mapped_column(String(255), default="")
    # draft | running | paused | completed
    status: Mapped[str] = mapped_column(String(20), default="running")
    # When true a visitor (by IP hash) always lands on the same variant.
    sticky: Mapped[bool] = mapped_column(Boolean, default=True)
    # Set when a winner is declared; not an FK to avoid a circular constraint.
    winner_variant_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), nullable=True,
    )

    link = relationship("Link", back_populates="ab_test")
    variants = relationship(
        "ABVariant",
        back_populates="test",
        cascade="all, delete-orphan",
        order_by="ABVariant.created_at",
    )


class ABVariant(Base, UUIDMixin, TimestampMixin):
    """A single destination in an A/B test, weighted for traffic splitting."""
    __tablename__ = "ab_variants"
    __table_args__ = (
        Index("idx_ab_variants_test", "ab_test_id"),
    )

    ab_test_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("ab_tests.id", ondelete="CASCADE"), nullable=False,
    )

    name: Mapped[str] = mapped_column(String(255), default="")
    destination_url: Mapped[str] = mapped_column(Text, nullable=False)
    weight: Mapped[int] = mapped_column(Integer, default=50)
    is_control: Mapped[bool] = mapped_column(Boolean, default=False)

    test = relationship("ABTest", back_populates="variants")
