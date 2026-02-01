"""Tests for BatchBriefingGenerator."""

import pytest
import asyncio
from agents.batch_generator import BatchBriefingGenerator, POPULAR_STANS
from agents.efficient_agent import EfficientBriefingAgent


@pytest.fixture
def batch_generator():
    """Create batch generator with efficient agent."""
    agent = EfficientBriefingAgent()
    return BatchBriefingGenerator(agent=agent)


@pytest.mark.asyncio
async def test_batch_generator_identifies_popular_stans(batch_generator):
    """Test that batch generator correctly identifies popular stans."""
    assert batch_generator.is_popular_stan("BTS")
    assert batch_generator.is_popular_stan("BlackPink")
    assert batch_generator.is_popular_stan("Taylor Swift")
    assert not batch_generator.is_popular_stan("UnknownStan123")


@pytest.mark.asyncio
async def test_batch_generator_gets_popular_briefing(batch_generator):
    """Test getting briefing for popular stan."""
    # Get briefing for BTS (popular)
    briefing = await batch_generator.get_briefing("BTS")

    # Verify structure
    assert "content" in briefing
    assert "topics" in briefing
    assert "sources" in briefing


@pytest.mark.asyncio
async def test_batch_generator_requires_user_id_for_custom(batch_generator):
    """Test that custom stans require user_id."""
    # Try to get custom stan without user_id
    with pytest.raises(ValueError, match="requires user_id"):
        await batch_generator.get_briefing("CustomStan123")


@pytest.mark.asyncio
async def test_batch_generator_handles_custom_stan_with_user_id(batch_generator):
    """Test getting briefing for custom stan with user_id."""
    # Get briefing for custom stan
    briefing = await batch_generator.get_briefing(
        stan_name="CustomStan123",
        user_id="test_user_123"
    )

    # Verify structure
    assert "content" in briefing
    assert "topics" in briefing


@pytest.mark.asyncio
async def test_batch_generation_completes(batch_generator):
    """Test that batch generation runs (limited to 2 stans for speed)."""
    # Temporarily limit to 2 stans for testing
    original_list = batch_generator.popular_stan_list
    batch_generator.popular_stan_list = ["BTS", "BlackPink"]

    try:
        stats = await batch_generator.generate_popular_briefings_daily()

        # Verify stats
        assert stats["total"] == 2
        assert stats["successes"] + stats["failures"] == 2
        assert "total_cost_usd" in stats
        assert "completed_at" in stats

    finally:
        # Restore original list
        batch_generator.popular_stan_list = original_list


@pytest.mark.asyncio
async def test_popular_stans_list_not_empty(batch_generator):
    """Test that we have popular stans configured."""
    assert len(batch_generator.popular_stan_list) > 0

    # Verify popular stans dict
    popular = batch_generator.get_popular_stans()
    assert "kpop" in popular
    assert "anime" in popular
    assert len(popular["kpop"]) > 0


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
