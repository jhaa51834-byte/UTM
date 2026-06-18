"""Tag validation router: check a page for GA4 / Adobe / Tealium / GTM tags."""
from fastapi import APIRouter, Depends, HTTPException

from ..deps import CurrentUser, require_role
from ..schemas.tag_validation import TagValidationReport, TagValidationRequest
from ..services.tag_validator import validate

router = APIRouter(tags=["tag-validation"])


@router.post("/validate-tags", response_model=TagValidationReport)
def validate_tags(
    req: TagValidationRequest,
    user: CurrentUser = Depends(require_role("viewer")),
):
    """Validate marketing tags on a destination URL (fetched) or pasted HTML."""
    try:
        return validate(url=req.url, html=req.html)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
