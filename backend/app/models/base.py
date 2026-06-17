"""SQLAlchemy model base, mixins, and shared utilities."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, text
from sqlalchemy.types import TypeDecorator, JSON, TEXT
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.ext.compiler import compiles

from ..database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(element, compiler, **kw):
    return "JSON"


class SafeArray(TypeDecorator):
    """Array type decorator that uses PostgreSQL ARRAY or fallback JSON on SQLite."""
    impl = TEXT
    cache_ok = True

    def __init__(self, item_type, *args, **kwargs):
        self.item_type = item_type
        super().__init__(*args, **kwargs)

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_ARRAY(self.item_type))
        else:
            return dialect.type_descriptor(JSON)

    def process_bind_param(self, value, dialect):
        return value

    def process_result_value(self, value, dialect):
        return value


class SafeUUID(TypeDecorator):
    """Database-agnostic UUID type.

    Uses PostgreSQL native UUID or fallback TEXT on SQLite.
    """
    impl = TEXT
    cache_ok = True

    def __init__(self, as_uuid=True, *args, **kwargs):
        self.as_uuid = as_uuid
        super().__init__(*args, **kwargs)

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import UUID as postgresql_UUID
            return dialect.type_descriptor(postgresql_UUID(as_uuid=self.as_uuid))
        else:
            return dialect.type_descriptor(TEXT)

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return str(value)
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value
        try:
            return uuid.UUID(value)
        except ValueError:
            if isinstance(value, int):
                return uuid.UUID(int=value)
            raise


# Aliases for importing in models
ARRAY = SafeArray
PG_UUID = SafeUUID


class TimestampMixin:
    """Adds created_at and updated_at columns."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False,
    )


class UUIDMixin:
    """UUID primary key using PostgreSQL uuid_generate_v4()."""
    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
