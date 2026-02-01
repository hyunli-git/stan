"""Rate limiting middleware for API endpoints.

Prevents abuse and controls costs by limiting requests per user.
"""

from typing import Optional, Callable
from fastapi import Request, HTTPException
from datetime import datetime, timedelta
import hashlib
import structlog

logger = structlog.get_logger()


class RateLimiter:
    """In-memory rate limiter with Redis backup."""

    def __init__(self, redis_client=None):
        """Initialize rate limiter.

        Args:
            redis_client: Optional Redis client for distributed rate limiting
        """
        self.redis = redis_client
        self.memory_cache = {}  # Fallback to memory if Redis unavailable

    async def check_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int
    ) -> tuple[bool, Optional[int]]:
        """Check if request is within rate limit.

        Args:
            key: Unique identifier (user_id, IP, etc.)
            max_requests: Maximum requests allowed
            window_seconds: Time window in seconds

        Returns:
            Tuple of (is_allowed, retry_after_seconds)
        """
        try:
            # Try Redis first
            if self.redis:
                return await self._check_redis(key, max_requests, window_seconds)
            else:
                return await self._check_memory(key, max_requests, window_seconds)

        except Exception as e:
            logger.error("rate_limit_check_failed", key=key, error=str(e))
            # Fail open (allow request) if rate limiting fails
            return True, None

    async def _check_redis(
        self,
        key: str,
        max_requests: int,
        window_seconds: int
    ) -> tuple[bool, Optional[int]]:
        """Check rate limit using Redis."""
        rate_key = f"rate_limit:{key}"

        # Get current count
        current = await self.redis.get(rate_key)

        if current is None:
            # First request in window
            await self.redis.setex(rate_key, window_seconds, 1)
            return True, None

        current = int(current)

        if current >= max_requests:
            # Rate limit exceeded
            ttl = await self.redis.ttl(rate_key)
            logger.warning("rate_limit_exceeded",
                          key=key,
                          current=current,
                          max=max_requests,
                          retry_after=ttl)
            return False, ttl

        # Increment counter
        await self.redis.incr(rate_key)
        return True, None

    async def _check_memory(
        self,
        key: str,
        max_requests: int,
        window_seconds: int
    ) -> tuple[bool, Optional[int]]:
        """Check rate limit using in-memory cache (fallback)."""
        now = datetime.now()

        # Clean up old entries periodically
        self._cleanup_memory_cache(now)

        if key not in self.memory_cache:
            self.memory_cache[key] = {
                "count": 1,
                "window_start": now,
                "window_seconds": window_seconds
            }
            return True, None

        entry = self.memory_cache[key]
        window_start = entry["window_start"]
        window_end = window_start + timedelta(seconds=window_seconds)

        if now > window_end:
            # Window expired, reset
            self.memory_cache[key] = {
                "count": 1,
                "window_start": now,
                "window_seconds": window_seconds
            }
            return True, None

        if entry["count"] >= max_requests:
            # Rate limit exceeded
            retry_after = int((window_end - now).total_seconds())
            logger.warning("rate_limit_exceeded_memory",
                          key=key,
                          current=entry["count"],
                          max=max_requests,
                          retry_after=retry_after)
            return False, retry_after

        # Increment counter
        entry["count"] += 1
        return True, None

    def _cleanup_memory_cache(self, now: datetime):
        """Clean up expired entries from memory cache."""
        keys_to_delete = []

        for key, entry in self.memory_cache.items():
            window_end = entry["window_start"] + timedelta(seconds=entry["window_seconds"])
            if now > window_end + timedelta(minutes=5):  # Keep 5 min buffer
                keys_to_delete.append(key)

        for key in keys_to_delete:
            del self.memory_cache[key]


# Global rate limiter instance
_rate_limiter: Optional[RateLimiter] = None


def init_rate_limiter(redis_client=None):
    """Initialize global rate limiter.

    Args:
        redis_client: Optional Redis client
    """
    global _rate_limiter
    _rate_limiter = RateLimiter(redis_client)
    logger.info("rate_limiter_initialized",
               redis_enabled=redis_client is not None)


def get_rate_limiter() -> RateLimiter:
    """Get global rate limiter instance."""
    if _rate_limiter is None:
        init_rate_limiter()
    return _rate_limiter


async def rate_limit_dependency(
    request: Request,
    max_requests: int = 10,
    window_seconds: int = 3600
) -> None:
    """FastAPI dependency for rate limiting.

    Args:
        request: FastAPI request object
        max_requests: Maximum requests allowed
        window_seconds: Time window in seconds

    Raises:
        HTTPException: If rate limit exceeded
    """
    # Get user identifier (prefer user_id, fallback to IP)
    user_id = getattr(request.state, "user_id", None)

    if user_id:
        key = f"user:{user_id}"
    else:
        # Use hashed IP as fallback
        ip = request.client.host if request.client else "unknown"
        key = f"ip:{hashlib.sha256(ip.encode()).hexdigest()[:16]}"

    # Check rate limit
    limiter = get_rate_limiter()
    is_allowed, retry_after = await limiter.check_rate_limit(
        key=key,
        max_requests=max_requests,
        window_seconds=window_seconds
    )

    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)} if retry_after else {}
        )


# Convenience functions for common rate limits
async def briefing_rate_limit(request: Request):
    """Rate limit for briefing generation: 5 per hour."""
    await rate_limit_dependency(request, max_requests=5, window_seconds=3600)


async def api_rate_limit(request: Request):
    """Rate limit for general API: 100 per hour."""
    await rate_limit_dependency(request, max_requests=100, window_seconds=3600)


async def auth_rate_limit(request: Request):
    """Rate limit for auth endpoints: 10 per 15 minutes."""
    await rate_limit_dependency(request, max_requests=10, window_seconds=900)
