"""
Redis-based caching service for briefings and API responses
"""

import os
import json
import hashlib
from typing import Any, Optional
from datetime import timedelta

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    print("Warning: redis not available, caching disabled")


class CacheService:
    """Cache service for storing and retrieving briefings."""

    def __init__(self):
        self.redis_client = None
        self.enabled = REDIS_AVAILABLE and os.getenv("REDIS_URL")

        if self.enabled:
            try:
                redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
                self.redis_client = redis.from_url(
                    redis_url,
                    encoding="utf-8",
                    decode_responses=True
                )
                print("Cache service initialized with Redis")
            except Exception as e:
                print(f"Failed to initialize Redis: {e}")
                self.enabled = False

    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if not self.enabled or not self.redis_client:
            return None

        try:
            value = await self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = 3600  # Default 1 hour
    ) -> bool:
        """Set value in cache with TTL."""
        if not self.enabled or not self.redis_client:
            return False

        try:
            serialized = json.dumps(value)
            await self.redis_client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete value from cache."""
        if not self.enabled or not self.redis_client:
            return False

        try:
            await self.redis_client.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False

    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern."""
        if not self.enabled or not self.redis_client:
            return 0

        try:
            keys = []
            async for key in self.redis_client.scan_iter(match=pattern):
                keys.append(key)

            if keys:
                return await self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            print(f"Cache clear pattern error: {e}")
            return 0

    def generate_key(self, prefix: str, *args: Any) -> str:
        """Generate cache key from prefix and arguments."""
        # Create hash from arguments for consistent keys
        arg_str = ":".join(str(arg) for arg in args)
        arg_hash = hashlib.md5(arg_str.encode()).hexdigest()[:8]
        return f"{prefix}:{arg_hash}"

    async def get_or_set(
        self,
        key: str,
        callback,
        ttl: int = 3600
    ) -> Any:
        """Get from cache or execute callback and cache result."""
        # Try to get from cache
        cached = await self.get(key)
        if cached is not None:
            print(f"Cache HIT: {key}")
            return cached

        print(f"Cache MISS: {key}")

        # Execute callback
        result = await callback() if callable(callback) else callback

        # Store in cache
        await self.set(key, result, ttl)

        return result

    async def close(self):
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()


# Global cache instance
cache_service = CacheService()


# Cache key generators
def briefing_cache_key(user_id: str, stan_id: str) -> str:
    """Generate cache key for user briefing."""
    return cache_service.generate_key("briefing", user_id, stan_id)


def daily_briefings_cache_key(user_id: str) -> str:
    """Generate cache key for daily briefings."""
    return cache_service.generate_key("daily", user_id)


def stan_cache_key(stan_id: str) -> str:
    """Generate cache key for stan data."""
    return cache_service.generate_key("stan", stan_id)
