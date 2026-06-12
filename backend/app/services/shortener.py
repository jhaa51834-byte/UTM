"""URL shortener integrations: TinyURL (no key needed) and Bitly (token)."""
import httpx
from fastapi import HTTPException

from ..config import settings


def shorten(url: str, provider: str) -> str:
    if provider == "bitly":
        return _bitly(url)
    return _tinyurl(url)


def _tinyurl(url: str) -> str:
    resp = httpx.get("https://tinyurl.com/api-create.php", params={"url": url}, timeout=15)
    if resp.status_code != 200 or not resp.text.startswith("http"):
        raise HTTPException(status_code=502, detail="TinyURL request failed.")
    return resp.text.strip()


def _bitly(url: str) -> str:
    if not settings.bitly_token:
        raise HTTPException(
            status_code=400,
            detail="Bitly is not configured. Set BITLY_TOKEN on the server.")
    resp = httpx.post(
        "https://api-ssl.bitly.com/v4/shorten",
        headers={"Authorization": f"Bearer {settings.bitly_token}"},
        json={"long_url": url},
        timeout=15,
    )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail="Bitly request failed.")
    return resp.json()["link"]
