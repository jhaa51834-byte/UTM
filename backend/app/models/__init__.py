"""Models package — exports all models for Alembic and app startup."""
from .api_key import APIKey
from .audit import AuditLog
from .base import Base, TimestampMixin, UUIDMixin, utcnow
from .campaign import Campaign
from .domain import CustomDomain
from .governance import GovernanceRule
from .link import Link, LinkTag

# Backward compat alias for old routers that reference UtmLink
UtmLink = Link
from .organization import OrgMembership, Organization, Team, TeamMembership
from .qr_code import QRCode
from .targeting import ABTest, ABVariant, RoutingRule
from .template import Template
from .user import RefreshToken, Session, User

__all__ = [
    "Base",
    "TimestampMixin",
    "UUIDMixin",
    "utcnow",
    # Auth
    "User",
    "Session",
    "RefreshToken",
    # Multi-tenancy
    "Organization",
    "Team",
    "OrgMembership",
    "TeamMembership",
    # Core
    "Link",
    "LinkTag",
    "UtmLink",
    "Campaign",
    "CustomDomain",
    "QRCode",
    "Template",
    "GovernanceRule",
    "APIKey",
    "AuditLog",
    # Smart redirect + A/B testing
    "RoutingRule",
    "ABTest",
    "ABVariant",
]
