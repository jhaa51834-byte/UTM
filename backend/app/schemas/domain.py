"""Domain schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DomainCreate(BaseModel):
    domain: str = Field(min_length=1, max_length=255, pattern=r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$")
    verification_method: str = Field(default="cname", pattern=r"^(cname|txt)$")


class DomainOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    domain: str
    verification_token: str
    verification_method: str
    is_verified: bool
    ssl_status: str
    ssl_expires_at: datetime | None = None
    health_status: str
    last_health_check: datetime | None = None
    created_at: datetime


class DomainVerifyResponse(BaseModel):
    is_verified: bool
    message: str
    dns_records_found: list[str] = Field(default_factory=list)


class DomainHealthResponse(BaseModel):
    health_status: str
    ssl_status: str
    response_time_ms: int | None = None
    message: str = ""
