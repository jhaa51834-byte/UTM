"""Organization and team schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OrgCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9][a-z0-9-]*[a-z0-9]$")


class OrgUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    logo_url: str | None = None
    settings: dict | None = None


class OrgOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    logo_url: str | None = None
    plan: str
    max_links: int
    max_domains: int
    max_users: int
    is_active: bool
    created_at: datetime


class TeamCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = ""


class TeamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    name: str
    description: str
    created_at: datetime


class MemberInvite(BaseModel):
    email: str
    role: str = Field(default="viewer", pattern=r"^(org_admin|marketing_manager|analyst|viewer)$")


class MemberOut(BaseModel):
    id: UUID
    user_id: UUID
    email: str
    full_name: str
    role: str
    joined_at: datetime


class MemberRoleUpdate(BaseModel):
    role: str = Field(pattern=r"^(org_admin|marketing_manager|analyst|viewer)$")
