"""AI naming assistant.

Turns a free-text campaign description into suggested UTM parameters.
Uses the Claude API when ANTHROPIC_API_KEY is configured; otherwise falls
back to a deterministic rules engine so the feature always works offline.
Suggestions are never applied automatically — the UI requires approval.
"""
import json
import re
from datetime import date

import httpx

from ..config import settings
from ..schemas import AiSuggestResponse
from .campaign_namer import slugify_part

# platform keyword -> (utm_source, default utm_medium)
_PLATFORMS = {
    "linkedin": ("linkedin", "paid_social"),
    "facebook": ("facebook", "paid_social"),
    "instagram": ("instagram", "paid_social"),
    "twitter": ("twitter", "paid_social"),
    "x ads": ("twitter", "paid_social"),
    "youtube": ("youtube", "paid_social"),
    "tiktok": ("tiktok", "paid_social"),
    "google": ("google", "cpc"),
    "bing": ("bing", "cpc"),
    "search ads": ("google", "cpc"),
    "email": ("email", "email"),
    "newsletter": ("email", "email"),
    "whatsapp": ("whatsapp", "referral"),
    "sms": ("sms", "sms"),
    "push": ("push", "push"),
    "reddit": ("reddit", "paid_social"),
    "affiliate": ("affiliate", "affiliate"),
    "partner": ("partner", "referral"),
    "display": ("display", "display"),
    "banner": ("display", "display"),
}

_INTENTS = {
    "leadgen": ["lead", "leads", "lead generation", "lead gen", "demo", "signup", "sign-up"],
    "awareness": ["awareness", "brand", "branding", "reach"],
    "webinar": ["webinar", "event", "workshop", "conference"],
    "launch": ["launch", "release", "new product", "announcement"],
    "remarketing": ["remarketing", "retargeting", "winback", "win-back"],
    "sale": ["sale", "discount", "offer", "promo", "promotion", "deal", "seasonal"],
    "app_install": ["app install", "install", "download app"],
}

_REGIONS = [
    "india", "usa", "us", "uk", "europe", "emea", "apac", "latam", "germany",
    "france", "canada", "australia", "singapore", "japan", "uae", "global",
]

_AUDIENCES = [
    "healthcare", "doctors", "developers", "marketers", "students", "smb",
    "enterprise", "finance", "fintech", "retail", "ecommerce", "hr",
    "education", "professionals", "founders", "agencies", "manufacturing",
]


def _suggest_with_rules(description: str) -> AiSuggestResponse:
    text = description.lower()
    year = str(date.today().year)
    if match := re.search(r"\b(20\d{2})\b", text):
        year = match.group(1)

    source, medium = "", ""
    for keyword, (src, med) in _PLATFORMS.items():
        if keyword in text:
            source, medium = src, med
            break
    if "organic" in text and medium == "paid_social":
        medium = "organic_social"

    intent = ""
    for name, keywords in _INTENTS.items():
        if any(k in text for k in keywords):
            intent = name
            break

    region = next((r for r in _REGIONS if re.search(rf"\b{re.escape(r)}\b", text)), "")
    audience = next((a for a in _AUDIENCES if a in text), "")

    # leadgen is the conventional default objective when none is stated
    campaign_parts = [p for p in (audience, region, intent or "leadgen", year) if p]
    campaign = "_".join(slugify_part(p) for p in campaign_parts)

    rationale_bits = []
    if source:
        rationale_bits.append(f"detected platform '{source}' (medium '{medium}')")
    if audience:
        rationale_bits.append(f"audience '{audience}'")
    if region:
        rationale_bits.append(f"region '{region}'")
    if intent:
        rationale_bits.append(f"intent '{intent}'")
    rationale = ("Rules engine: " + ", ".join(rationale_bits)) if rationale_bits else \
        "Rules engine: no strong signals detected — please review the suggestion."

    return AiSuggestResponse(
        utm_source=source, utm_medium=medium, utm_campaign=campaign,
        rationale=rationale, engine="rules", needs_approval=True,
    )


_CLAUDE_PROMPT = """You convert a marketing campaign description into UTM parameters.
Respond with ONLY a JSON object, no prose:
{{"utm_source": "...", "utm_medium": "...", "utm_campaign": "...", "utm_content": "", "utm_term": "", "rationale": "one sentence"}}
Rules: lowercase snake_case values; utm_medium one of cpc, paid_social, organic_social, email, display, affiliate, referral, push, sms, organic;
utm_campaign formatted as audience_region_intent_year. Current year: {year}.

Description: {description}"""


def _suggest_with_claude(description: str) -> AiSuggestResponse | None:
    try:
        resp = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.anthropic_api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": settings.anthropic_model,
                "max_tokens": 300,
                "messages": [{
                    "role": "user",
                    "content": _CLAUDE_PROMPT.format(
                        year=date.today().year, description=description),
                }],
            },
            timeout=20,
        )
        resp.raise_for_status()
        text = resp.json()["content"][0]["text"]
        data = json.loads(re.search(r"\{.*\}", text, re.S).group(0))
        return AiSuggestResponse(
            utm_source=slugify_part(data.get("utm_source", "")),
            utm_medium=slugify_part(data.get("utm_medium", "")),
            utm_campaign=slugify_part(data.get("utm_campaign", "")),
            utm_content=slugify_part(data.get("utm_content", "")),
            utm_term=slugify_part(data.get("utm_term", "")),
            rationale=data.get("rationale", ""),
            engine="claude",
            needs_approval=True,
        )
    except Exception:
        return None  # fall back to rules engine


def suggest(description: str) -> AiSuggestResponse:
    if settings.anthropic_api_key:
        result = _suggest_with_claude(description)
        if result:
            return result
    return _suggest_with_rules(description)
