"""Dependencies package."""
from .auth import (
    CurrentUser,
    RequireAdmin,
    RequireAnalyst,
    RequireManager,
    RequireSuperAdmin,
    RequireViewer,
    get_current_user,
    get_optional_user,
    require_role,
)
from .database import DBSession, get_db
from .pagination import PaginationParams

__all__ = [
    "CurrentUser",
    "RequireViewer",
    "RequireAnalyst",
    "RequireManager",
    "RequireAdmin",
    "RequireSuperAdmin",
    "get_current_user",
    "get_optional_user",
    "require_role",
    "get_db",
    "DBSession",
    "PaginationParams",
]
