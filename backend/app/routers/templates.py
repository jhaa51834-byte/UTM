"""Campaign template library."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Template
from ..schemas import TemplateIn, TemplateOut
from .deps import Identity, audit, get_identity

router = APIRouter(tags=["templates"])


@router.get("/templates", response_model=list[TemplateOut])
def list_templates(db: Session = Depends(get_db)):
    return db.query(Template).order_by(Template.name).all()


@router.post("/save-template", response_model=TemplateOut)
def save_template(
    req: TemplateIn,
    db: Session = Depends(get_db),
    identity: Identity = Depends(get_identity),
):
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Template name is required.")
    existing = db.query(Template).filter(Template.name == name).first()
    if existing:
        for field, value in req.model_dump().items():
            setattr(existing, field, value)
        template = existing
        action = "update_template"
    else:
        template = Template(**req.model_dump(), created_by=identity.user)
        db.add(template)
        action = "save_template"
    db.commit()
    db.refresh(template)
    audit(db, identity, action, name)
    return template


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    identity: Identity = Depends(get_identity),
):
    template = db.get(Template, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")
    db.delete(template)
    db.commit()
    audit(db, identity, "delete_template", template.name)
    return {"deleted": template_id}
