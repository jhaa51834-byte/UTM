"""Base62 encoding/decoding for short URL codes.

Uses the alphabet: 0-9, A-Z, a-z (62 characters).
Encodes a positive integer into a compact string suitable for URLs.
"""

ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
BASE = len(ALPHABET)
_REVERSE = {c: i for i, c in enumerate(ALPHABET)}


def encode(num: int) -> str:
    """Encode a positive integer to a Base62 string."""
    if num < 0:
        raise ValueError("Cannot encode negative numbers")
    if num == 0:
        return ALPHABET[0]
    chars: list[str] = []
    while num > 0:
        num, remainder = divmod(num, BASE)
        chars.append(ALPHABET[remainder])
    return "".join(reversed(chars))


def decode(s: str) -> int:
    """Decode a Base62 string back to an integer."""
    num = 0
    for char in s:
        if char not in _REVERSE:
            raise ValueError(f"Invalid Base62 character: {char!r}")
        num = num * BASE + _REVERSE[char]
    return num


def encode_padded(num: int, length: int = 7) -> str:
    """Encode with zero-padding to ensure minimum length."""
    encoded = encode(num)
    return encoded.zfill(length) if len(encoded) < length else encoded
