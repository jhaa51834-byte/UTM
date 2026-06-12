"""Bulk CSV generation and export."""
import io
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..services import bulk
from .deps import Identity, audit, get_identity

router = APIRouter(tags=["bulk"])


@router.post("/bulk-generate")
async def bulk_generate(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    identity: Identity = Depends(get_identity),
):
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file.")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="CSV must be under 5 MB.")
    rows = bulk.process_csv(content)
    if not rows:
        raise HTTPException(
            status_code=400,
            detail="No rows found. Expected columns: URL, Source, Medium, Campaign, Content, Term.")
    audit(db, identity, "bulk_generate", f"{file.filename}: {len(rows)} rows")
    return {"rows": rows, "total": len(rows),
            "ok": sum(1 for r in rows if r["status"] != "error")}


@router.post("/bulk-export")
def bulk_export(rows_json: str = Form(...), fmt: str = Form("csv")):
    try:
        rows = json.loads(rows_json)
        assert isinstance(rows, list)
    except (json.JSONDecodeError, AssertionError):
        raise HTTPException(status_code=400, detail="Invalid rows payload.")

    if fmt == "xlsx":
        data = bulk.export_xlsx(rows)
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        name = "utm_urls.xlsx"
    else:
        data = bulk.export_csv(rows)
        media = "text/csv"
        name = "utm_urls.csv"
    return StreamingResponse(
        io.BytesIO(data), media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{name}"'})
