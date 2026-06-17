"""QR code generation service: PNG, SVG, and PDF output."""
from __future__ import annotations

import io
import uuid

import segno


def generate_qr(
    url: str,
    fmt: str = "png",
    scale: int = 8,
    dark: str = "#000000",
    light: str = "#ffffff",
    data_dark: str | None = None,
) -> tuple[bytes, str]:
    """Generate a QR code and return (data_bytes, media_type).

    Supported formats: png, svg, pdf
    """
    qr = segno.make(url, error="H")

    buf = io.BytesIO()

    if fmt == "svg":
        qr.save(buf, kind="svg", scale=scale, dark=dark, light=light)
        media_type = "image/svg+xml"
    elif fmt == "pdf":
        qr.save(buf, kind="pdf", scale=scale, dark=dark, light=light)
        media_type = "application/pdf"
    else:
        qr.save(buf, kind="png", scale=scale, dark=dark, light=light)
        media_type = "image/png"

    buf.seek(0)
    return buf.read(), media_type


def generate_qr_with_style(
    url: str,
    style: dict | None = None,
    fmt: str = "png",
) -> tuple[bytes, str]:
    """Generate a styled QR code from a style configuration dict."""
    style = style or {}
    return generate_qr(
        url=url,
        fmt=fmt,
        scale=style.get("scale", 8),
        dark=style.get("dark", "#000000"),
        light=style.get("light", "#ffffff"),
    )
