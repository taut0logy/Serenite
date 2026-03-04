"""
FastAPI authentication middleware — Phase 3 redesign.

Replaces the previous approach of calling the GraphQL endpoint with a direct
call to the hardened REST endpoint POST /api/token/verify, protected by a
shared INTERNAL_API_KEY.

Includes a TTL-based in-memory cache (cachetools) to avoid hammering the
Next.js server on every request.  Cache key = SHA-256 hash of the raw token.
"""

from __future__ import annotations

import hashlib
from typing import Any

import httpx
from cachetools import TTLCache
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config.settings import settings
from utils.logger import logger

# Never log or cache raw tokens — only hash digests.
_cache: TTLCache[str, dict[str, Any]] = TTLCache(maxsize=1000, ttl=30)

security = HTTPBearer(auto_error=False)


def _token_hash(token: str) -> str:
    """SHA-256 digest of a token, used as cache key."""
    return hashlib.sha256(token.encode()).hexdigest()


async def _verify_token(token: str) -> dict[str, Any] | None:
    """
    Call POST /api/token/verify on the Next.js server.
    Returns the user dict on success, or None on failure.
    Caches the result for 30 seconds per token hash.
    """
    cache_key = _token_hash(token)

    # 1. Return from cache if available
    if cache_key in _cache:
        return _cache[cache_key]

    # 2. Call the REST verify endpoint
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.TOKEN_VERIFY_ENDPOINT,
                json={"token": token},
                headers={
                    "Content-Type": "application/json",
                    "X-Internal-API-Key": settings.INTERNAL_API_KEY,
                },
                timeout=settings.AUTH_TIMEOUT,
            )

        if response.status_code != 200:
            if settings.DEBUG:
                logger.error(
                    f"[auth] Token verify returned HTTP {response.status_code}"
                )
            return None

        data = response.json()
        if not data.get("valid") or not data.get("user"):
            return None

        user = data["user"]
        _cache[cache_key] = user
        return user

    except httpx.TimeoutException:
        logger.error("[auth] Token verify request timed out")
        return None
    except Exception as exc:
        logger.error(f"[auth] Token verify error: {exc}")
        return None


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict[str, Any]:
    """
    FastAPI dependency — resolves the authenticated user.

    Token extraction order:
      1. Authorization: Bearer <token>   (primary — set by the Next.js proxy)
      2. authjs.session-token cookie     (fallback for same-domain callers)
    """
    token: str | None = None

    if credentials:
        token = credentials.credentials

    if not token:
        token = request.cookies.get("__Secure-authjs.session-token") or \
                request.cookies.get("authjs.session-token")

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await _verify_token(token)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("verified"):
        raise HTTPException(
            status_code=403,
            detail="Email not verified",
        )

    return user


async def require_admin(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Dependency — requires ADMIN role."""
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def require_role(
    role: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Dependency — requires a specific role."""
    if current_user.get("role") != role:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return current_user
