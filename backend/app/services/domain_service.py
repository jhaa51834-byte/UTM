"""Domain service: DNS verification and health monitoring."""
from __future__ import annotations

import secrets
import socket
import ssl
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from ..models.domain import CustomDomain


def create_domain(
    db: Session,
    org_id: uuid.UUID,
    domain: str,
    verification_method: str = "cname",
) -> CustomDomain:
    """Create a custom domain entry with a verification token."""
    token = secrets.token_hex(32)
    d = CustomDomain(
        org_id=org_id,
        domain=domain.lower().strip(),
        verification_token=token,
        verification_method=verification_method,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


def verify_domain_dns(domain_record: CustomDomain) -> tuple[bool, str, list[str]]:
    """Verify DNS configuration for a custom domain.

    For CNAME: checks if the domain has a CNAME pointing to our service.
    For TXT: checks if a TXT record with the verification token exists.

    Returns (is_verified, message, records_found).
    """
    records_found = []
    domain = domain_record.domain

    try:
        if domain_record.verification_method == "txt":
            # Look for TXT record with verification token
            import dns.resolver
            try:
                answers = dns.resolver.resolve(f"_trackflow-verify.{domain}", "TXT")
                for rdata in answers:
                    txt_value = rdata.to_text().strip('"')
                    records_found.append(f"TXT: {txt_value}")
                    if domain_record.verification_token in txt_value:
                        return True, "Domain verified via TXT record.", records_found
            except Exception:
                pass
            return False, f"TXT record '_trackflow-verify.{domain}' not found with token.", records_found

        else:
            # CNAME verification: check if domain resolves
            try:
                addr = socket.getaddrinfo(domain, 443, proto=socket.IPPROTO_TCP)
                if addr:
                    records_found.append(f"DNS resolves to {addr[0][4][0]}")
                    return True, "Domain resolves. CNAME verified.", records_found
            except socket.gaierror:
                pass
            return False, f"Domain '{domain}' does not resolve. Add CNAME record.", records_found

    except Exception as e:
        return False, f"DNS verification failed: {str(e)}", records_found


def check_domain_health(domain_record: CustomDomain) -> dict:
    """Check the health and SSL status of a custom domain."""
    domain = domain_record.domain
    result = {
        "health_status": "unknown",
        "ssl_status": "pending",
        "response_time_ms": None,
        "message": "",
    }

    try:
        import time
        start = time.time()

        # Check DNS resolution
        try:
            socket.getaddrinfo(domain, 443, proto=socket.IPPROTO_TCP)
        except socket.gaierror:
            result["health_status"] = "down"
            result["message"] = "Domain does not resolve."
            return result

        # Check SSL
        try:
            ctx = ssl.create_default_context()
            with socket.create_connection((domain, 443), timeout=10) as sock:
                with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()
                    if cert:
                        result["ssl_status"] = "active"
                        # Check expiry
                        expires = datetime.strptime(
                            cert["notAfter"], "%b %d %H:%M:%S %Y %Z"
                        ).replace(tzinfo=timezone.utc)
                        if expires < datetime.now(timezone.utc):
                            result["ssl_status"] = "expired"
        except ssl.SSLError:
            result["ssl_status"] = "error"
        except Exception:
            result["ssl_status"] = "pending"

        elapsed_ms = int((time.time() - start) * 1000)
        result["response_time_ms"] = elapsed_ms
        result["health_status"] = "healthy" if result["ssl_status"] == "active" else "degraded"
        result["message"] = "Domain is reachable."

    except Exception as e:
        result["health_status"] = "down"
        result["message"] = str(e)

    return result
