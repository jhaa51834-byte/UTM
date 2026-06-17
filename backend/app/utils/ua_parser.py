"""User-agent parsing utility.

Extracts device type, browser, and OS from User-Agent strings.
Uses a lightweight regex approach instead of a heavy library.
"""
import re
from dataclasses import dataclass


@dataclass
class ParsedUA:
    device_type: str = "desktop"  # desktop, mobile, tablet
    browser: str = "Unknown"
    browser_version: str = ""
    os: str = "Unknown"
    os_version: str = ""
    is_bot: bool = False


# Bot patterns
_BOT_RE = re.compile(
    r"(bot|crawler|spider|scraper|headless|phantom|selenium|puppeteer|"
    r"googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|"
    r"facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|"
    r"python-requests|curl|wget|httpx|axios|node-fetch|go-http|"
    r"java/|okhttp|apache-httpclient)", re.IGNORECASE
)

# Mobile patterns
_MOBILE_RE = re.compile(
    r"(Mobile|Android.*Mobile|iPhone|iPod|Opera Mini|IEMobile|"
    r"WPDesktop|Windows Phone)", re.IGNORECASE
)

# Tablet patterns
_TABLET_RE = re.compile(
    r"(Tablet|iPad|Nexus 7|Nexus 10|KFAPWI|Silk|PlayBook)", re.IGNORECASE
)

# Browser patterns (order matters — more specific first)
_BROWSERS = [
    (re.compile(r"Edg[eA]?/([\d.]+)"), "Edge"),
    (re.compile(r"OPR/([\d.]+)"), "Opera"),
    (re.compile(r"Vivaldi/([\d.]+)"), "Vivaldi"),
    (re.compile(r"Brave"), "Brave"),
    (re.compile(r"SamsungBrowser/([\d.]+)"), "Samsung Internet"),
    (re.compile(r"UCBrowser/([\d.]+)"), "UC Browser"),
    (re.compile(r"Firefox/([\d.]+)"), "Firefox"),
    (re.compile(r"Chrome/([\d.]+)"), "Chrome"),
    (re.compile(r"Safari/([\d.]+)"), "Safari"),
    (re.compile(r"MSIE ([\d.]+)"), "Internet Explorer"),
    (re.compile(r"Trident/.*rv:([\d.]+)"), "Internet Explorer"),
]

# OS patterns
_OS_PATTERNS = [
    (re.compile(r"Windows NT 10\.0"), "Windows", "10"),
    (re.compile(r"Windows NT 6\.3"), "Windows", "8.1"),
    (re.compile(r"Windows NT 6\.1"), "Windows", "7"),
    (re.compile(r"Mac OS X ([\d_]+)"), "macOS", None),
    (re.compile(r"CrOS"), "Chrome OS", ""),
    (re.compile(r"Linux"), "Linux", ""),
    (re.compile(r"Android ([\d.]+)"), "Android", None),
    (re.compile(r"iPhone OS ([\d_]+)"), "iOS", None),
    (re.compile(r"iPad.*OS ([\d_]+)"), "iPadOS", None),
]


def parse_user_agent(ua_string: str) -> ParsedUA:
    """Parse a User-Agent string into structured components."""
    if not ua_string:
        return ParsedUA()

    result = ParsedUA()

    # Bot detection
    if _BOT_RE.search(ua_string):
        result.is_bot = True
        result.device_type = "bot"
        result.browser = "Bot"
        return result

    # Device type
    if _TABLET_RE.search(ua_string):
        result.device_type = "tablet"
    elif _MOBILE_RE.search(ua_string):
        result.device_type = "mobile"
    else:
        result.device_type = "desktop"

    # Browser
    for pattern, name in _BROWSERS:
        match = pattern.search(ua_string)
        if match:
            result.browser = name
            result.browser_version = match.group(1) if match.lastindex else ""
            break

    # Special case: Safari detection (Chrome also contains Safari)
    if result.browser == "Safari" and "Chrome" in ua_string:
        result.browser = "Chrome"
        chrome_match = re.search(r"Chrome/([\d.]+)", ua_string)
        if chrome_match:
            result.browser_version = chrome_match.group(1)

    # OS
    for pattern, name, default_version in _OS_PATTERNS:
        match = pattern.search(ua_string)
        if match:
            result.os = name
            if default_version is not None:
                result.os_version = default_version
            elif match.lastindex:
                result.os_version = match.group(1).replace("_", ".")
            break

    return result
