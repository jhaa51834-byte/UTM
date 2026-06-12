"""QR code generation (PNG / SVG) via segno — no native dependencies."""
import io

import segno


def make_qr(url: str, fmt: str = "png", scale: int = 8) -> tuple[bytes, str]:
    qr = segno.make(url, error="m")
    buf = io.BytesIO()
    if fmt == "svg":
        qr.save(buf, kind="svg", scale=scale, dark="#111827", light=None)
        return buf.getvalue(), "image/svg+xml"
    qr.save(buf, kind="png", scale=scale, dark="#111827")
    return buf.getvalue(), "image/png"
