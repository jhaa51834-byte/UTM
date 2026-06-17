"""Authentication dependencies: JWT extraction, role checks, tenant context."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..config import settings
from ..models.organization import OrgMembership
from ..models.user import User
from .database import DBSession, get_db

security = HTTPBearer(auto_error=False)

# Role hierarchy (higher index = more permissions)
ROLE_HIERARCHY = {
    "viewer": 0,
    "analyst": 1,
    "marketing_manager": 2,
    "org_admin": 3,
    "super_admin": 4,
}


class CurrentUser:
    """Represents the authenticated user with org context."""

    def __init__(
        self,
        user: User,
        org_id: uuid.UUID | None = None,
        role: str = "viewer",
    ):
        self.user = user
        self.id = user.id
        self.email = user.email
        self.org_id = org_id
        self.role = role
        self.is_superadmin = user.is_superadmin

    def has_role(self, minimum_role: str) -> bool:
        """Check if user has at least the specified role level."""
        if self.is_superadmin:
            return True
        user_level = ROLE_HIERARCHY.get(self.role, 0)
        required_level = ROLE_HIERARCHY.get(minimum_role, 0)
        return user_level >= required_level

    def require_role(self, minimum_role: str) -> None:
        """Raise 403 if user doesn't have the required role."""
        if not self.has_role(minimum_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{minimum_role}' or higher required. Your role: '{self.role}'.",
            )

    def require_org(self) -> uuid.UUID:
        """Raise 400 if no organization context is set."""
        if not self.org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization context required. Set X-Org-Id header.",
            )
        return self.org_id


def _decode_token(token: str) -> dict:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type.",
            )
        exp = payload.get("exp")
        if exp and datetime.fromtimestamp(exp, tz=timezone.utc) < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired.",
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: DBSession = Depends(get_db),
) -> CurrentUser:
    """Extract and validate the current user from JWT token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = _decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")

    # Fetch user
    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")

    if hasattr(db, "execute"):
        # Async session
        result = await db.execute(select(User).where(User.id == uid))
        user = result.scalar_one_or_none()
    else:
        # Sync session
        user = db.query(User).filter(User.id == uid).first()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")

    # Determine org context from header or token
    org_id_str = request.headers.get("X-Org-Id") or payload.get("org_id")
    org_id = None
    role = "viewer"

    if org_id_str:
        try:
            org_id = uuid.UUID(org_id_str)
        except ValueError:
            pass

    if user.is_superadmin:
        role = "super_admin"
    elif org_id:
        # Look up membership
        if hasattr(db, "execute"):
            result = await db.execute(
                select(OrgMembership).where(
                    OrgMembership.user_id == uid,
                    OrgMembership.org_id == org_id,
                )
            )
            membership = result.scalar_one_or_none()
        else:
            membership = db.query(OrgMembership).filter(
                OrgMembership.user_id == uid,
                OrgMembership.org_id == org_id,
            ).first()

        if membership:
            role = membership.role
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this organization.",
            )

    return CurrentUser(user=user, org_id=org_id, role=role)


async def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: DBSession = Depends(get_db),
) -> CurrentUser | None:
    """Like get_current_user but returns None instead of raising."""
    if not credentials:
        return None
    try:
        return await get_current_user(request, credentials, db)
    except HTTPException:
        return None


# ── Role-specific dependencies ──────────────────────────────────

def require_role(minimum_role: str):
    """Factory for role-checking dependencies."""
    async def _check(current_user: CurrentUser = Depends(get_current_user)):
        current_user.require_role(minimum_role)
        return current_user
    return _check


RequireViewer = Annotated[CurrentUser, Depends(require_role("viewer"))]
RequireAnalyst = Annotated[CurrentUser, Depends(require_role("analyst"))]
RequireManager = Annotated[CurrentUser, Depends(require_role("marketing_manager"))]
RequireAdmin = Annotated[CurrentUser, Depends(require_role("org_admin"))]
RequireSuperAdmin = Annotated[CurrentUser, Depends(require_role("super_admin"))]
