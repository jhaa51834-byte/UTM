from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UtmLink(Base):
    """History of every generated UTM URL."""

    __tablename__ = "utm_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    base_url: Mapped[str] = mapped_column(Text, nullable=False)
    final_url: Mapped[str] = mapped_column(Text, nullable=False)
    short_url: Mapped[str] = mapped_column(Text, default="")
    utm_source: Mapped[str] = mapped_column(String(255), default="")
    utm_medium: Mapped[str] = mapped_column(String(255), default="")
    utm_campaign: Mapped[str] = mapped_column(String(255), default="")
    utm_content: Mapped[str] = mapped_column(String(255), default="")
    utm_term: Mapped[str] = mapped_column(String(255), default="")
    custom_params: Mapped[dict] = mapped_column(JSON, default=dict)
    created_by: Mapped[str] = mapped_column(String(120), default="anonymous")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Template(Base):
    """Reusable campaign templates (team-shared)."""

    __tablename__ = "templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    utm_source: Mapped[str] = mapped_column(String(255), default="")
    utm_medium: Mapped[str] = mapped_column(String(255), default="")
    utm_campaign: Mapped[str] = mapped_column(String(255), default="")
    utm_content: Mapped[str] = mapped_column(String(255), default="")
    utm_term: Mapped[str] = mapped_column(String(255), default="")
    custom_params: Mapped[dict] = mapped_column(JSON, default=dict)
    created_by: Mapped[str] = mapped_column(String(120), default="anonymous")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class GovernanceRule(Base):
    """Admin-defined parameter combination rules.

    When `match_field` equals `match_value`, then `required_field` must be one
    of `allowed_values` (comma-separated). severity: "error" blocks generation,
    "warning" only flags it.
    """

    __tablename__ = "governance_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    match_field: Mapped[str] = mapped_column(String(64), nullable=False)
    match_value: Mapped[str] = mapped_column(String(255), nullable=False)
    required_field: Mapped[str] = mapped_column(String(64), nullable=False)
    allowed_values: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(16), default="error")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str] = mapped_column(String(120), default="admin")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditLog(Base):
    """Audit trail for enterprise compliance."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor: Mapped[str] = mapped_column(String(120), default="anonymous")
    role: Mapped[str] = mapped_column(String(64), default="member")
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    detail: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
