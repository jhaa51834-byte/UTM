"""Bulk CSV processing: parse uploaded CSV, generate UTM URLs per row,
export results as CSV or Excel.

Expected columns (case-insensitive, order-free):
    URL, Source, Medium, Campaign, Content, Term
Unknown extra columns are treated as custom parameters.
"""
import csv
import io

from openpyxl import Workbook

from ..schemas import GenerateRequest, ValidateRequest
from .utm_builder import build_utm_url
from .validator import validate_all

_KNOWN = {
    "url": "base_url",
    "source": "utm_source",
    "medium": "utm_medium",
    "campaign": "utm_campaign",
    "content": "utm_content",
    "term": "utm_term",
}

RESULT_COLUMNS = ["url", "source", "medium", "campaign", "content", "term",
                  "final_url", "status", "issues"]


def process_csv(file_bytes: bytes) -> list[dict]:
    text = file_bytes.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        return []

    results: list[dict] = []
    for row in reader:
        if not any((v or "").strip() for v in row.values()):
            continue  # skip blank lines
        mapped: dict[str, str] = {}
        custom: dict[str, str] = {}
        for key, value in row.items():
            if key is None:
                continue
            norm = key.strip().lower().replace("utm_", "")
            value = (value or "").strip()
            if norm in _KNOWN:
                mapped[_KNOWN[norm]] = value
            elif value:
                custom[key.strip()] = value

        req = GenerateRequest(
            base_url=mapped.get("base_url", ""),
            utm_source=mapped.get("utm_source", ""),
            utm_medium=mapped.get("utm_medium", ""),
            utm_campaign=mapped.get("utm_campaign", ""),
            utm_content=mapped.get("utm_content", ""),
            utm_term=mapped.get("utm_term", ""),
            custom_params=custom,
        )
        issues = validate_all(ValidateRequest(**req.model_dump(exclude={"override_existing_utms", "force"})))
        errors = [i for i in issues if i.level == "error"]
        final_url = "" if errors else build_utm_url(req)
        results.append({
            "url": req.base_url,
            "source": req.utm_source,
            "medium": req.utm_medium,
            "campaign": req.utm_campaign,
            "content": req.utm_content,
            "term": req.utm_term,
            "final_url": final_url,
            "status": "error" if errors else ("warning" if issues else "ok"),
            "issues": "; ".join(i.message for i in issues),
        })
    return results


def export_csv(rows: list[dict]) -> bytes:
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=RESULT_COLUMNS, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    return buf.getvalue().encode("utf-8-sig")


def export_xlsx(rows: list[dict]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "UTM URLs"
    ws.append([c.replace("_", " ").title() for c in RESULT_COLUMNS])
    for row in rows:
        ws.append([row.get(c, "") for c in RESULT_COLUMNS])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
