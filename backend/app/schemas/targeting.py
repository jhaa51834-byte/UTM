"""Schemas for smart-redirect routing rules and A/B testing."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

# ── Allowed condition vocabulary (kept in sync with services.smart_redirect) ──
RuleField = Literal[
    "country", "country_code", "region", "city",
    "device_type", "browser", "os", "language",
    "hour", "weekday", "date",
]
RuleOperator = Literal[
    "equals", "not_equals", "in", "not_in", "contains",
    "gte", "lte", "between",
]


class RuleCondition(BaseModel):
    """A single condition: <field> <operator> <value>.

    ``value`` is a string for scalar operators and a list for
    ``in`` / ``not_in`` / ``between``.
    """
    field: RuleField
    operator: RuleOperator
    value: Union[str, int, list[Union[str, int]]]

    @model_validator(mode="after")
    def _check_value_shape(self) -> "RuleCondition":
        list_ops = {"in", "not_in", "between"}
        if self.operator in list_ops and not isinstance(self.value, list):
            raise ValueError(f"operator '{self.operator}' requires a list value")
        if self.operator == "between" and len(self.value) != 2:  # type: ignore[arg-type]
            raise ValueError("operator 'between' requires exactly two values")
        if self.operator not in list_ops and isinstance(self.value, list):
            raise ValueError(f"operator '{self.operator}' requires a scalar value")
        return self


# ── Routing rules ────────────────────────────────────────────────────────────

class RoutingRuleCreate(BaseModel):
    name: str = Field(default="", max_length=255)
    priority: int = Field(default=100, ge=0, le=10000)
    is_active: bool = True
    conditions: list[RuleCondition] = Field(min_length=1)
    destination_url: str = Field(min_length=1)

    @field_validator("destination_url")
    @classmethod
    def _check_url(cls, v: str) -> str:
        v = v.strip()
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("destination_url must start with http:// or https://")
        return v


class RoutingRuleUpdate(BaseModel):
    name: str | None = None
    priority: int | None = Field(default=None, ge=0, le=10000)
    is_active: bool | None = None
    conditions: list[RuleCondition] | None = None
    destination_url: str | None = None


class RoutingRuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    link_id: UUID
    name: str = ""
    priority: int = 100
    is_active: bool = True
    conditions: list[dict] = Field(default_factory=list)
    destination_url: str
    created_at: datetime
    updated_at: datetime


# ── A/B testing ───────────────────────────────────────────────────────────────

class ABVariantCreate(BaseModel):
    name: str = Field(default="", max_length=255)
    destination_url: str = Field(min_length=1)
    weight: int = Field(default=50, ge=0, le=100)
    is_control: bool = False

    @field_validator("destination_url")
    @classmethod
    def _check_url(cls, v: str) -> str:
        v = v.strip()
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("destination_url must start with http:// or https://")
        return v


class ABTestCreate(BaseModel):
    name: str = Field(default="", max_length=255)
    sticky: bool = True
    status: Literal["draft", "running", "paused"] = "running"
    variants: list[ABVariantCreate] = Field(min_length=2)

    @model_validator(mode="after")
    def _check_weights(self) -> "ABTestCreate":
        total = sum(v.weight for v in self.variants)
        if total != 100:
            raise ValueError(f"variant weights must sum to 100 (got {total})")
        return self


class ABTestUpdate(BaseModel):
    name: str | None = None
    sticky: bool | None = None
    status: Literal["draft", "running", "paused", "completed"] | None = None


class ABVariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str = ""
    destination_url: str
    weight: int = 50
    is_control: bool = False


class ABVariantResult(BaseModel):
    variant_id: UUID
    name: str = ""
    destination_url: str
    weight: int = 0
    is_control: bool = False
    total_clicks: int = 0
    unique_clicks: int = 0
    share_pct: float = 0.0
    is_winner: bool = False


class ABTestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    link_id: UUID
    name: str = ""
    status: str = "running"
    sticky: bool = True
    winner_variant_id: UUID | None = None
    variants: list[ABVariantOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ABTestResults(BaseModel):
    test_id: UUID
    status: str
    total_clicks: int = 0
    variants: list[ABVariantResult] = Field(default_factory=list)
    leading_variant_id: UUID | None = None


class DeclareWinnerRequest(BaseModel):
    variant_id: UUID
    # When true, the link's primary destination is rewritten to the winner and
    # the test is marked completed.
    apply_to_link: bool = True


# ── Smart deep linking ─────────────────────────────────────────────────────────

def _validate_app_target(v: str) -> str:
    """Allow app schemes (myapp://…) and http(s) app links; reject anything else."""
    v = (v or "").strip()
    if not v:
        return v
    if "://" not in v:
        raise ValueError("must be a URI like myapp://path or https://…")
    return v


class DeepLinkConfigUpsert(BaseModel):
    """Create or replace a link's deep-link configuration."""
    is_active: bool = True
    deferred: bool = True

    android_package_name: str = Field(default="", max_length=255)
    android_deep_link: str = ""
    play_store_url: str = ""

    ios_bundle_id: str = Field(default="", max_length=255)
    ios_deep_link: str = ""
    app_store_url: str = ""

    desktop_url: str = ""

    @field_validator("android_deep_link", "ios_deep_link")
    @classmethod
    def _check_app_links(cls, v: str) -> str:
        return _validate_app_target(v)

    @field_validator("play_store_url", "app_store_url", "desktop_url")
    @classmethod
    def _check_urls(cls, v: str) -> str:
        v = (v or "").strip()
        if v and not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("must start with http:// or https://")
        return v

    @model_validator(mode="after")
    def _need_one_platform(self) -> "DeepLinkConfigUpsert":
        if not (self.android_deep_link or self.play_store_url
                or self.ios_deep_link or self.app_store_url):
            raise ValueError("configure at least one of Android or iOS targets")
        return self


class DeepLinkConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    link_id: UUID
    is_active: bool = True
    deferred: bool = True
    android_package_name: str = ""
    android_deep_link: str = ""
    play_store_url: str = ""
    ios_bundle_id: str = ""
    ios_deep_link: str = ""
    app_store_url: str = ""
    desktop_url: str = ""
    created_at: datetime
    updated_at: datetime


class DeferredDeepLinkOut(BaseModel):
    """Returned to a freshly-installed app claiming its deferred path."""
    found: bool = False
    deep_link: str = ""
    short_code: str = ""
