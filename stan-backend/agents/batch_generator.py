"""Batch briefing generator for cost optimization.

Generates briefings for popular stans once per day, caches for all users.
90% cost reduction compared to per-user generation.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, date
import asyncio
from agents.base_agent import STANBaseAgent
from services.cache_service import cache_service
import structlog

logger = structlog.get_logger()


# Top popular stans across different categories
POPULAR_STANS = {
    "kpop": ["BTS", "BlackPink", "NewJeans", "Stray Kids", "TWICE", "Seventeen"],
    "anime": ["One Piece", "Naruto", "Attack on Titan", "Demon Slayer", "Jujutsu Kaisen"],
    "sports": ["Lionel Messi", "Cristiano Ronaldo", "LeBron James", "Tom Brady"],
    "entertainment": ["Taylor Swift", "Marvel", "Star Wars", "The Weeknd"],
    "gaming": ["League of Legends", "Valorant", "Genshin Impact", "Minecraft"],
}


class BatchBriefingGenerator:
    """Generate once, serve to many users."""

    def __init__(self, agent=None):
        """Initialize with an agent for generation.

        Args:
            agent: Agent to use for briefing generation (EfficientBriefingAgent or BriefingOrchestrator)
        """
        self.agent = agent
        self.popular_stan_list = self._flatten_popular_stans()

    def _flatten_popular_stans(self) -> List[str]:
        """Flatten the popular stans dictionary into a list."""
        result = []
        for category, stans in POPULAR_STANS.items():
            result.extend(stans)
        return result

    async def generate_popular_briefings_daily(self) -> Dict[str, Any]:
        """Generate all popular stan briefings at 6am daily.

        Returns:
            Dict with generation stats (count, successes, failures, total_cost)
        """
        logger.info("batch_generation_started",
                   total_stans=len(self.popular_stan_list),
                   timestamp=datetime.now().isoformat())

        stats = {
            "total": len(self.popular_stan_list),
            "successes": 0,
            "failures": 0,
            "total_cost_usd": 0.0,
            "started_at": datetime.now().isoformat(),
        }

        # Generate all briefings in parallel (with some concurrency limit)
        tasks = []
        for stan_name in self.popular_stan_list:
            task = self._generate_and_cache_briefing(stan_name)
            tasks.append(task)

        # Process in batches of 5 to avoid overwhelming the API
        batch_size = 5
        for i in range(0, len(tasks), batch_size):
            batch = tasks[i:i + batch_size]
            results = await asyncio.gather(*batch, return_exceptions=True)

            for stan_name, result in zip(self.popular_stan_list[i:i + batch_size], results):
                if isinstance(result, Exception):
                    logger.error("batch_generation_failed",
                               stan_name=stan_name,
                               error=str(result))
                    stats["failures"] += 1
                else:
                    stats["successes"] += 1
                    if result and "cost_usd" in result:
                        stats["total_cost_usd"] += result["cost_usd"]

            # Small delay between batches
            if i + batch_size < len(tasks):
                await asyncio.sleep(2)

        stats["completed_at"] = datetime.now().isoformat()

        logger.info("batch_generation_completed",
                   **stats)

        return stats

    async def _generate_and_cache_briefing(self, stan_name: str) -> Dict[str, Any]:
        """Generate briefing for a stan and cache it.

        Args:
            stan_name: Name of the stan

        Returns:
            Dict with cost_usd and other metadata
        """
        try:
            # Check if agent is available
            if not self.agent:
                raise ValueError("No agent configured for batch generation")

            # Create stan data structure
            stan_data = {
                "name": stan_name,
                "categories": {"primary": "popular"},
                "priority": 1
            }

            # Generate briefing
            logger.info("generating_briefing", stan_name=stan_name)
            start_time = datetime.now()

            # Use the configured agent (could be efficient or orchestrator)
            if hasattr(self.agent, 'generate_comprehensive_briefing'):
                briefing = await self.agent.generate_comprehensive_briefing(stan_data)
            else:
                briefing = await self.agent.generate_briefing(stan_name)

            duration_ms = (datetime.now() - start_time).total_seconds() * 1000

            # Estimate cost (rough estimate: $0.08 per briefing for efficient agent)
            estimated_cost = 0.08  # Will be more accurate with actual token counting

            # Cache for 24 hours
            cache_key = f"public:briefing:{stan_name}:{date.today().isoformat()}"
            await cache_service.set(
                key=cache_key,
                value=briefing,
                ttl=86400  # 24 hours
            )

            logger.info("briefing_cached",
                       stan_name=stan_name,
                       cache_key=cache_key,
                       duration_ms=duration_ms,
                       cost_usd=estimated_cost)

            return {
                "cost_usd": estimated_cost,
                "duration_ms": duration_ms,
                "cached_key": cache_key
            }

        except Exception as e:
            logger.error("briefing_generation_error",
                        stan_name=stan_name,
                        error=str(e))
            raise

    async def get_briefing(self, stan_name: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get briefing for a stan (cached if popular, generated if custom).

        Args:
            stan_name: Name of the stan
            user_id: User ID for custom stans and rate limiting

        Returns:
            Briefing dict with content, topics, sources, etc.
        """
        # Check if it's a popular stan
        if stan_name in self.popular_stan_list:
            # Serve from cache
            cache_key = f"public:briefing:{stan_name}:{date.today().isoformat()}"
            cached = await cache_service.get(cache_key)

            if cached:
                logger.info("briefing_served_from_cache",
                           stan_name=stan_name,
                           user_id=user_id)
                return cached

            # If cache miss (shouldn't happen with daily cron), generate on-demand
            logger.warning("cache_miss_for_popular_stan",
                          stan_name=stan_name,
                          cache_key=cache_key)
            result = await self._generate_and_cache_briefing(stan_name)
            return await cache_service.get(cache_key)

        # For custom stans, check user-specific cache (1 per day limit)
        if user_id:
            cache_key = f"user:{user_id}:stan:{stan_name}:{date.today().isoformat()}"
            cached = await cache_service.get(cache_key)

            if cached:
                logger.info("custom_briefing_served_from_cache",
                           stan_name=stan_name,
                           user_id=user_id)
                return cached

            # Generate fresh for custom stan
            logger.info("generating_custom_briefing",
                       stan_name=stan_name,
                       user_id=user_id)

            if not self.agent:
                raise ValueError("No agent configured")

            stan_data = {
                "name": stan_name,
                "categories": {"primary": "custom"},
                "priority": 1
            }

            if hasattr(self.agent, 'generate_comprehensive_briefing'):
                briefing = await self.agent.generate_comprehensive_briefing(stan_data)
            else:
                briefing = await self.agent.generate_briefing(stan_name)

            # Cache for 24 hours (rate limiting: 1 per day)
            await cache_service.set(
                key=cache_key,
                value=briefing,
                ttl=86400
            )

            return briefing

        # No user_id for custom stan - shouldn't happen
        raise ValueError(f"Custom stan '{stan_name}' requires user_id")

    def is_popular_stan(self, stan_name: str) -> bool:
        """Check if a stan is in the popular list.

        Args:
            stan_name: Name of the stan

        Returns:
            True if popular, False otherwise
        """
        return stan_name in self.popular_stan_list

    def get_popular_stans(self) -> Dict[str, List[str]]:
        """Get all popular stans by category.

        Returns:
            Dict mapping category to list of stan names
        """
        return POPULAR_STANS.copy()
