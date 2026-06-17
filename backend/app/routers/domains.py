"""Custom domains router: CRUD, verify, health check."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import CurrentUser, RequireAdmin, RequireViewer, get_db
from ..models.domain import CustomDomain
from ..schemas.common import DeleteResponse
from ..schemas.domain import (
    DomainCreate, DomainHealthResponse, DomainOut, DomainVerifyResponse,
)
from ..services.domain_service import check_domain_health, create_domain, verify_domain_dns

router = APIRouter(prefix="/domains", tags=["domains"])


@router.post("", response_model=DomainOut, status_code=status.HTTP_201_CREATED)
def add_domain(
    req: DomainCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(RequireAdmin),
):
    org_id = user.require_org()
    existing = db.query(CustomDomain).filter(CustomDomain.domain == req.domain.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Domain already registered.")
    domain = create_domain(db, org_id, req.domain, req.verification_method)
    return DomainOut.model_validate(domain)


@router.get("", response_model=list[DomainOut])
def list_domains(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(RequireViewer),
):
    org_id = user.require_org()
    domains = db.query(CustomDomain).filter(CustomDomain.org_id == org_id).all()
    return [DomainOut.model_validate(d) for d in domains]


@router.post("/{domain_id}/verify", response_model=DomainVerifyResponse)
def verify_domain(
    domain_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(RequireAdmin),
):
    org_id = user.require_org()
    domain = db.query(CustomDomain).filter(
        CustomDomain.id == domain_id, CustomDomain.org_id == org_id,
    ).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found.")

    is_verified, message, records = verify_domain_dns(domain)
    domain.is_verified = is_verified
    db.commit()
    return DomainVerifyResponse(
        is_verified=is_verified, message=message, dns_records_found=records,
    )


@router.get("/{domain_id}/health", response_model=DomainHealthResponse)
def domain_health(
    domain_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(RequireAdmin),
):
    org_id = user.require_org()
    domain = db.query(CustomDomain).filter(
        CustomDomain.id == domain_id, CustomDomain.org_id == org_id,
    ).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found.")
    result = check_domain_health(domain)
    from datetime import datetime, timezone
    domain.health_status = result["health_status"]
    domain.ssl_status = result["ssl_status"]
    domain.last_health_check = datetime.now(timezone.utc)
    db.commit()
    return DomainHealthResponse(**result)


@router.delete("/{domain_id}", response_model=DeleteResponse)
def delete_domain(
    domain_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(RequireAdmin),
):
    org_id = user.require_org()
    domain = db.query(CustomDomain).filter(
        CustomDomain.id == domain_id, CustomDomain.org_id == org_id,
    ).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found.")
    db.delete(domain)
    db.commit()
    return DeleteResponse(deleted=1)
