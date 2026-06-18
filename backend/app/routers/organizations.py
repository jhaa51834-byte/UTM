"""Organizations, teams, and membership router."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..deps import CurrentUser, get_current_user, get_db, require_role
from ..models.organization import OrgMembership, Organization, Team
from ..models.user import User
from ..schemas.common import DeleteResponse
from ..schemas.organization import (
    MemberInvite, MemberOut, MemberRoleUpdate, OrgCreate, OrgOut,
    TeamCreate, TeamOut,
)

router = APIRouter(tags=["organizations"])


# ── Organizations ────────────────────────────────────────────────

@router.post("/organizations", response_model=OrgOut, status_code=status.HTTP_201_CREATED)
def create_org(
    req: OrgCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    existing = db.query(Organization).filter(Organization.slug == req.slug).first()
    if existing:
        raise HTTPException(status_code=409, detail="Organization slug already taken.")
    org = Organization(name=req.name, slug=req.slug)
    db.add(org)
    db.flush()
    membership = OrgMembership(user_id=user.id, org_id=org.id, role="org_admin", is_default=True)
    db.add(membership)
    db.commit()
    db.refresh(org)
    return OrgOut.model_validate(org)


@router.get("/organizations", response_model=list[OrgOut])
def list_orgs(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    memberships = db.query(OrgMembership).filter(OrgMembership.user_id == user.id).all()
    org_ids = [m.org_id for m in memberships]
    orgs = db.query(Organization).filter(Organization.id.in_(org_ids)).all()
    return [OrgOut.model_validate(o) for o in orgs]


@router.get("/organizations/{org_id}", response_model=OrgOut)
def get_org(
    org_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    m = db.query(OrgMembership).filter(
        OrgMembership.user_id == user.id, OrgMembership.org_id == org_id,
    ).first()
    if not m:
        raise HTTPException(status_code=403, detail="Not a member.")
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Not found.")
    return OrgOut.model_validate(org)


# ── Members ──────────────────────────────────────────────────────

@router.get("/organizations/{org_id}/members", response_model=list[MemberOut])
def list_members(
    org_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("org_admin")),
):
    memberships = db.query(OrgMembership).filter(OrgMembership.org_id == org_id).all()
    result = []
    for m in memberships:
        u = db.query(User).filter(User.id == m.user_id).first()
        if u:
            result.append(MemberOut(
                id=m.id, user_id=u.id, email=u.email, full_name=u.full_name,
                role=m.role, joined_at=m.joined_at,
            ))
    return result


@router.post("/organizations/{org_id}/invite", response_model=MemberOut, status_code=201)
def invite_member(
    org_id: UUID,
    req: MemberInvite,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("org_admin")),
):
    target_user = db.query(User).filter(User.email == req.email.lower()).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found. They must register first.")
    existing = db.query(OrgMembership).filter(
        OrgMembership.user_id == target_user.id, OrgMembership.org_id == org_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already a member.")
    membership = OrgMembership(user_id=target_user.id, org_id=org_id, role=req.role)
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return MemberOut(
        id=membership.id, user_id=target_user.id, email=target_user.email,
        full_name=target_user.full_name, role=req.role, joined_at=membership.joined_at,
    )


@router.put("/organizations/{org_id}/members/{member_id}/role", response_model=MemberOut)
def update_member_role(
    org_id: UUID,
    member_id: UUID,
    req: MemberRoleUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("org_admin")),
):
    m = db.query(OrgMembership).filter(
        OrgMembership.id == member_id, OrgMembership.org_id == org_id,
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found.")
    m.role = req.role
    db.commit()
    u = db.query(User).filter(User.id == m.user_id).first()
    return MemberOut(
        id=m.id, user_id=u.id, email=u.email, full_name=u.full_name,
        role=m.role, joined_at=m.joined_at,
    )


@router.delete("/organizations/{org_id}/members/{member_id}", response_model=DeleteResponse)
def remove_member(
    org_id: UUID,
    member_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("org_admin")),
):
    m = db.query(OrgMembership).filter(
        OrgMembership.id == member_id, OrgMembership.org_id == org_id,
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found.")
    db.delete(m)
    db.commit()
    return DeleteResponse(deleted=1)


# ── Teams ────────────────────────────────────────────────────────

@router.post("/organizations/{org_id}/teams", response_model=TeamOut, status_code=201)
def create_team(
    org_id: UUID,
    req: TeamCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_role("org_admin")),
):
    team = Team(org_id=org_id, name=req.name, description=req.description)
    db.add(team)
    db.commit()
    db.refresh(team)
    return TeamOut.model_validate(team)


@router.get("/organizations/{org_id}/teams", response_model=list[TeamOut])
def list_teams(
    org_id: UUID,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    teams = db.query(Team).filter(Team.org_id == org_id).all()
    return [TeamOut.model_validate(t) for t in teams]
