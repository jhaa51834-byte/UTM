"""Schemas for the marketing tag validator."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class TagValidationRequest(BaseModel):
    """Validate by URL (fetched server-side) or by pasted HTML."""
    url: str = ""
    html: str = ""

    @model_validator(mode="after")
    def _need_input(self) -> "TagValidationRequest":
        if not self.url.strip() and not self.html.strip():
            raise ValueError("provide a url or html to validate")
        if self.url and not (self.url.startswith("http://") or self.url.startswith("https://")):
            raise ValueError("url must start with http:// or https://")
        return self


class TagFinding(BaseModel):
    key: str
    label: str
    category: str  # analytics | tag_manager | data_layer | advertising
    found: bool = False
    ids: list[str] = Field(default_factory=list)
    evidence: str = ""


class Recommendation(BaseModel):
    level: Literal["info", "warning", "error"] = "info"
    message: str


class TagValidationReport(BaseModel):
    url: str = ""
    fetched: bool = False
    score: int = 0
    tags: list[TagFinding] = Field(default_factory=list)
    utm_present: bool = False
    utm_params: dict[str, str] = Field(default_factory=dict)
    data_layers: list[str] = Field(default_factory=list)
    recommendations: list[Recommendation] = Field(default_factory=list)
