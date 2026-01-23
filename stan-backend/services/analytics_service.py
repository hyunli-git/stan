"""
Analytics service for tracking usage, performance, and costs
"""

import os
from datetime import datetime
from typing import Dict, Any, Optional
from collections import defaultdict
import json


class AnalyticsService:
    """Service for tracking and analyzing application metrics."""

    def __init__(self):
        self.metrics = defaultdict(int)
        self.events = []
        self.cost_tracking = {
            "total_tokens": 0,
            "total_requests": 0,
            "estimated_cost": 0.0
        }

    def track_event(
        self,
        event_type: str,
        event_data: Dict[str, Any],
        user_id: Optional[str] = None
    ):
        """Track an event."""
        event = {
            "type": event_type,
            "data": event_data,
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
        }
        self.events.append(event)
        self.metrics[event_type] += 1

        # Log important events
        if event_type in ["briefing_generated", "error", "api_call"]:
            print(f"📊 Event: {event_type} - {event_data}")

    def track_briefing_generation(
        self,
        stan_name: str,
        user_id: Optional[str],
        duration_ms: float,
        token_count: Optional[int] = None,
        agent_count: int = 1
    ):
        """Track briefing generation metrics."""
        self.track_event("briefing_generated", {
            "stan_name": stan_name,
            "duration_ms": duration_ms,
            "token_count": token_count,
            "agent_count": agent_count
        }, user_id)

        if token_count:
            self.cost_tracking["total_tokens"] += token_count
            # Estimate cost (Gemini 2.0 Flash: ~$0.10 per 1M tokens)
            estimated_cost = (token_count / 1_000_000) * 0.10
            self.cost_tracking["estimated_cost"] += estimated_cost

        self.cost_tracking["total_requests"] += 1

    def track_api_call(
        self,
        endpoint: str,
        method: str,
        status_code: int,
        duration_ms: float,
        user_id: Optional[str] = None
    ):
        """Track API call metrics."""
        self.track_event("api_call", {
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "duration_ms": duration_ms
        }, user_id)

    def track_error(
        self,
        error_type: str,
        error_message: str,
        context: Optional[Dict[str, Any]] = None
    ):
        """Track errors."""
        self.track_event("error", {
            "error_type": error_type,
            "message": error_message,
            "context": context or {}
        })

    def track_cache_hit(self, cache_key: str):
        """Track cache hit."""
        self.metrics["cache_hits"] += 1

    def track_cache_miss(self, cache_key: str):
        """Track cache miss."""
        self.metrics["cache_misses"] += 1

    def get_cache_hit_rate(self) -> float:
        """Calculate cache hit rate."""
        hits = self.metrics.get("cache_hits", 0)
        misses = self.metrics.get("cache_misses", 0)
        total = hits + misses
        return (hits / total * 100) if total > 0 else 0.0

    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of all metrics."""
        total_briefings = self.metrics.get("briefing_generated", 0)
        total_api_calls = self.metrics.get("api_call", 0)
        total_errors = self.metrics.get("error", 0)

        return {
            "total_briefings_generated": total_briefings,
            "total_api_calls": total_api_calls,
            "total_errors": total_errors,
            "error_rate": (total_errors / total_api_calls * 100) if total_api_calls > 0 else 0.0,
            "cache_hit_rate": self.get_cache_hit_rate(),
            "cost_tracking": self.cost_tracking,
            "metrics": dict(self.metrics)
        }

    def get_recent_events(self, limit: int = 100) -> list:
        """Get recent events."""
        return self.events[-limit:]

    def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get statistics for a specific user."""
        user_events = [e for e in self.events if e.get("user_id") == user_id]

        briefings = [e for e in user_events if e["type"] == "briefing_generated"]

        return {
            "total_events": len(user_events),
            "total_briefings": len(briefings),
            "most_recent_briefing": briefings[-1] if briefings else None
        }

    def reset_metrics(self):
        """Reset all metrics (for testing)."""
        self.metrics.clear()
        self.events.clear()
        self.cost_tracking = {
            "total_tokens": 0,
            "total_requests": 0,
            "estimated_cost": 0.0
        }

    def export_metrics(self, format: str = "json") -> str:
        """Export metrics in specified format."""
        data = self.get_metrics_summary()

        if format == "json":
            return json.dumps(data, indent=2)
        elif format == "prometheus":
            # Prometheus format
            lines = []
            for key, value in data["metrics"].items():
                lines.append(f'stan_metric{{type="{key}"}} {value}')
            lines.append(f'stan_cost_total {data["cost_tracking"]["estimated_cost"]}')
            lines.append(f'stan_tokens_total {data["cost_tracking"]["total_tokens"]}')
            return "\n".join(lines)
        else:
            return str(data)


# Global analytics instance
analytics_service = AnalyticsService()
