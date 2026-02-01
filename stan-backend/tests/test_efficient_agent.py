"""Tests for EfficientBriefingAgent."""

import pytest
import asyncio
from agents.efficient_agent import EfficientBriefingAgent


@pytest.mark.asyncio
async def test_efficient_agent_generates_briefing():
    """Test that efficient agent can generate a briefing."""
    agent = EfficientBriefingAgent()

    # Generate briefing for BTS
    briefing = await agent.generate_briefing("BTS")

    # Verify structure
    assert "content" in briefing
    assert "summary" in briefing
    assert "sources" in briefing
    assert "topics" in briefing
    assert "generated_by" in briefing
    assert "metadata" in briefing

    # Verify content is not empty
    assert len(briefing["content"]) > 100
    assert len(briefing["summary"]) > 10

    # Verify topics have required fields
    for topic in briefing["topics"]:
        assert "title" in topic
        assert "content" in topic
        assert "sources" in topic
        assert "category" in topic
        assert "priority" in topic


@pytest.mark.asyncio
async def test_efficient_agent_handles_unknown_stan():
    """Test that agent handles unknown stans gracefully."""
    agent = EfficientBriefingAgent()

    # Generate briefing for obscure/unknown stan
    briefing = await agent.generate_briefing("UnknownStanXYZ123")

    # Should still return valid structure (even if content is minimal)
    assert "content" in briefing
    assert "topics" in briefing


@pytest.mark.asyncio
async def test_efficient_agent_extracts_sources():
    """Test that agent extracts real source URLs."""
    agent = EfficientBriefingAgent()

    briefing = await agent.generate_briefing("Taylor Swift")

    # Should have sources
    assert len(briefing["sources"]) > 0

    # Sources should be valid URLs
    for source in briefing["sources"]:
        assert source.startswith("http")


@pytest.mark.asyncio
async def test_efficient_agent_fallback_on_error():
    """Test that agent returns fallback briefing on error."""
    agent = EfficientBriefingAgent()

    # Mock an error by using invalid model
    original_model = agent.model_name
    agent.model_name = "invalid-model-xyz"

    try:
        briefing = await agent.generate_briefing("BTS")

        # Should get fallback briefing
        assert "error" in briefing.get("metadata", {}) or \
               "unavailable" in briefing["content"].lower()

    finally:
        # Restore original model
        agent.model_name = original_model


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
