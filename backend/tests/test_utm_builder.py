from app.schemas import GenerateRequest, ValidateRequest
from app.services.campaign_namer import generate_campaign_name
from app.services.utm_builder import build_utm_url
from app.services.validator import validate_all


def make(base_url: str, **kw) -> GenerateRequest:
    defaults = dict(utm_source="google", utm_medium="cpc",
                    utm_campaign="summer_sale_2026")
    defaults.update(kw)
    return GenerateRequest(base_url=base_url, **defaults)


def test_spec_output_example():
    req = make("https://example.com/product", utm_content="banner_1")
    assert build_utm_url(req) == (
        "https://example.com/product?utm_source=google&utm_medium=cpc"
        "&utm_campaign=summer_sale_2026&utm_content=banner_1")


def test_preserves_existing_query_params():
    url = build_utm_url(make("https://example.com/p?ref=abc&page=2"))
    assert "ref=abc" in url and "page=2" in url
    assert url.index("ref=abc") < url.index("utm_source=google")


def test_replaces_existing_utms():
    url = build_utm_url(make("https://example.com/p?utm_source=old&utm_medium=stale"))
    assert "old" not in url and "stale" not in url
    assert "utm_source=google" in url and "utm_medium=cpc" in url


def test_preserves_fragment():
    url = build_utm_url(make("https://example.com/p?x=1#pricing"))
    assert url.endswith("#pricing")
    assert "utm_campaign=summer_sale_2026" in url


def test_drops_duplicate_existing_params():
    url = build_utm_url(make("https://example.com/p?a=1&a=2"))
    assert url.count("a=") == 1


def test_sanitizes_values():
    url = build_utm_url(make("https://example.com/p",
                             utm_campaign="  Summer Sale 2026 "))
    assert "utm_campaign=summer_sale_2026" in url


def test_international_characters_encoded():
    url = build_utm_url(make("https://example.com/p", utm_term="café münchen"))
    assert "utm_term=caf%C3%A9_m%C3%BCnchen" in url


def test_custom_params_appended():
    req = make("https://example.com/p", custom_params={"CID": "ABC 123", "vendor": "acme"})
    url = build_utm_url(req)
    assert "cid=abc_123" in url and "vendor=acme" in url


def test_empty_fields_omitted():
    req = GenerateRequest(base_url="https://example.com/p",
                          utm_source="email", utm_medium="email")
    url = build_utm_url(req)
    assert "utm_campaign" not in url and "utm_term" not in url


def test_campaign_name_generator_spec_example():
    assert generate_campaign_name(
        ["AnalyticsTool", "India", "Q3", "2026"]) == "analytics_tool_india_q3_2026"


def test_campaign_name_strips_special_chars():
    assert generate_campaign_name(["Big Sale!!", "50% Off"]) == "big_sale_50_off"


def test_validator_flags_missing_source_and_medium():
    issues = validate_all(ValidateRequest(base_url="https://example.com"))
    codes = {i.code for i in issues}
    assert "missing_source" in codes and "missing_medium" in codes


def test_validator_flags_invalid_url():
    issues = validate_all(ValidateRequest(
        base_url="notaurl", utm_source="google", utm_medium="cpc"))
    assert any(i.level == "error" and i.field == "base_url" for i in issues)


def test_validator_flags_mixed_casing():
    issues = validate_all(ValidateRequest(
        base_url="https://example.com", utm_source="Google", utm_medium="cpc"))
    assert any(i.code == "mixed_casing" for i in issues)


def test_validator_flags_existing_utms():
    issues = validate_all(ValidateRequest(
        base_url="https://example.com?utm_source=x",
        utm_source="google", utm_medium="cpc"))
    assert any(i.code == "existing_utms" for i in issues)


def test_validator_flags_very_long_url():
    issues = validate_all(
        ValidateRequest(base_url="https://example.com",
                        utm_source="google", utm_medium="cpc"),
        final_url="https://example.com/?q=" + "x" * 3000)
    assert any(i.code == "url_too_long" for i in issues)
