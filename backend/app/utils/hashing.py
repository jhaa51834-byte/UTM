"""Password hashing and IP anonymization utilities."""
import hashlib
import secrets

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def hash_ip(ip_address: str, salt: str = "") -> str:
    """SHA-256 hash of an IP address for privacy-compliant storage."""
    return hashlib.sha256(f"{ip_address}:{salt}".encode()).hexdigest()


def generate_api_key() -> tuple[str, str, str]:
    """Generate a new API key.

    Returns:
        (full_key, prefix, key_hash)
    """
    full_key = f"tf_{secrets.token_urlsafe(32)}"
    prefix = full_key[:10]
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    return full_key, prefix, key_hash


def verify_api_key(provided_key: str, stored_hash: str) -> bool:
    """Verify an API key against its stored hash."""
    computed_hash = hashlib.sha256(provided_key.encode()).hexdigest()
    return secrets.compare_digest(computed_hash, stored_hash)


def generate_token(nbytes: int = 32) -> str:
    """Generate a cryptographically secure random token."""
    return secrets.token_urlsafe(nbytes)
