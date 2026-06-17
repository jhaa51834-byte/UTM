"""Governance rule schemas."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GovernanceRuleIn(BaseModel):
    name: str
    match_field: str
    match_value: str
    required_field: str
    allowed_values: list[str]
    severity: str = Field(default="error", pattern=r"^(error|warning)$")
    is_active: bool = True


class GovernanceRuleUpdate(BaseModel):
    name: str | None = None
    allowed_values: list[str] | None = None
    severity: str | None = Field(default=None, pattern=r"^(error|warning)$")
    is_active: bool | None = None


class GovernanceRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: UUID
    name: str
    match_field: str
    match_value: str
    required_field: str
    allowed_values: str  # Comma-separated in DB, parsed in API
    severity: str
    is_active: bool
    created_by: UUID | None = None
    created_at: datetime

    @property
    def allowed_values_list(self) -> list[str]:
        return [v.strip() for v in self.allowed_values.split(",") if v.strip()]
