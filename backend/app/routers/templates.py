"""Campaign template library."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Template
from .deps import Identity, audit, get_identity

router = APIRouter(tags=["templates"])


class TemplateIn(BaseModel):
    name: str
    utm_source: str = ""
    utm_medium: str = ""
    utm_campaign: str = ""
    utm_content: str = ""
    utm_term: str = ""
    custom_params: dict = {}


@router.get("/templates")
def list_templates(db: Session = Depends(get_db)):
    templates = db.query(Template).order_by(Template.name).all()
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "utm_source": t.utm_source,
            "utm_medium": t.utm_medium,
            "utm_campaign": t.utm_campaign,
            "utm_content": t.utm_content,
            "utm_term": t.utm_term,
            "custom_params": t.custom_params or {},
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in templates
    ]


@router.post("/save-template")
def save_template(
    req: TemplateIn,
    db: Session = Depends(get_db),
    identity: Identity = Depends(get_identity),
):
    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Template name is required.")

    import uuid
    org_id = uuid.UUID(identity.org_id) if identity.org_id else uuid.UUID(int=0)

    existing = db.query(Template).filter(
        Template.name == name, Template.org_id == org_id,
    ).first()

    if existing:
        for field, value in req.model_dump(exclude={"name"}).items():
            setattr(existing, field, value)
        template = existing
        action = "update_template"
    else:
        template = Template(
            org_id=org_id,
            name=name,
            utm_source=req.utm_source,
            utm_medium=req.utm_medium,
            utm_campaign=req.utm_campaign,
            utm_content=req.utm_content,
            utm_term=req.utm_term,
            custom_params=req.custom_params,
        )
        db.add(template)
        action = "save_template"

    db.commit()
    db.refresh(template)
    audit(db, identity, action, name)
    return {
        "id": str(template.id),
        "name": template.name,
        "utm_source": template.utm_source,
        "utm_medium": template.utm_medium,
        "utm_campaign": template.utm_campaign,
    }


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    identity: Identity = Depends(get_identity),
):
    import uuid
    try:
        uid = uuid.UUID(template_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid template ID.")
    template = db.query(Template).filter(Template.id == uid).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found.")
    db.delete(template)
    db.commit()
    audit(db, identity, "delete_template", template.name)
    return {"deleted": 1}
