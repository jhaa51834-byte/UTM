"""Authentication router: register, login, refresh, logout, OAuth."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import get_current_user, get_db, CurrentUser
from ..schemas.auth import (
    LoginRequest, RefreshRequest, RegisterRequest, TokenResponse,
)
from ..services.auth_service import (
    authenticate_user, create_access_token, create_refresh_token,
    get_user_default_org, register_user, revoke_refresh_token,
    store_refresh_token, verify_refresh_token,
)
from ..config import settings

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user. Optionally creates an organization."""
    try:
        user, org = register_user(
            db,
            email=req.email,
            password=req.password,
            full_name=req.full_name,
            org_name=req.org_name,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    org_id = org.id if org else None
    access_token = create_access_token(user.id, org_id)
    raw_refresh, refresh_hash = create_refresh_token(user.id)
    store_refresh_token(db, user.id, refresh_hash)

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=settings.jwt_access_token_expires_minutes * 60,
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email/password."""
    user = authenticate_user(db, req.email, req.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    org_id = get_user_default_org(db, user.id)
    access_token = create_access_token(user.id, org_id)
    raw_refresh, refresh_hash = create_refresh_token(user.id)
    store_refresh_token(db, user.id, refresh_hash)

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=settings.jwt_access_token_expires_minutes * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(req: RefreshRequest, db: Session = Depends(get_db)):
    """Refresh an access token using a refresh token."""
    user = verify_refresh_token(db, req.refresh_token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )

    # Rotate: revoke old, issue new
    revoke_refresh_token(db, req.refresh_token)

    org_id = get_user_default_org(db, user.id)
    access_token = create_access_token(user.id, org_id)
    raw_refresh, refresh_hash = create_refresh_token(user.id)
    store_refresh_token(db, user.id, refresh_hash)

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=settings.jwt_access_token_expires_minutes * 60,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    req: RefreshRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Revoke a refresh token (logout)."""
    revoke_refresh_token(db, req.refresh_token)
