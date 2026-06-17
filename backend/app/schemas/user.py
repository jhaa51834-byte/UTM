"""User schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str
    avatar_url: str | None = None
    is_active: bool
    is_superadmin: bool
    email_verified: bool
    last_login_at: datetime | None = None
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    avatar_url: str | None = None


class UserWithRole(UserOut):
    """User with their role in the current organization."""
    role: str = "viewer"
    org_id: UUID | None = None
    org_name: str | None = None
