"""Governance rule model for UTM parameter validation rules."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base
from .base import PG_UUID, UUIDMixin, utcnow


class GovernanceRule(Base, UUIDMixin):
    __tablename__ = "governance_rules"

    org_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    match_field: Mapped[str] = mapped_column(String(64), nullable=False)
    match_value: Mapped[str] = mapped_column(String(255), nullable=False)
    required_field: Mapped[str] = mapped_column(String(64), nullable=False)
    allowed_values: Mapped[str] = mapped_column(Text, nullable=False)  # Comma-separated
    severity: Mapped[str] = mapped_column(String(16), default="error")  # error, warning
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="governance_rules")
