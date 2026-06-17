"""Common schemas: pagination, error responses, shared types."""
from __future__ import annotations

from typing import Any, Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Query parameters for paginated endpoints."""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated response wrapper."""
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class ErrorResponse(BaseModel):
    detail: str
    code: str = ""
    errors: list[dict[str, Any]] = Field(default_factory=list)


class SuccessResponse(BaseModel):
    message: str = "ok"
    id: UUID | None = None


class DeleteResponse(BaseModel):
    deleted: int
