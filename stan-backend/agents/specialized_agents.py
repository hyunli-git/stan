"""Specialized ADK agents for different stan categories."""

from typing import Dict, Any, List, Optional
import google.adk as genai_adk
from agents.base_agent import STANBaseAgent
from agents.multimodal_agent import MultimodalAgent, VoiceAgent
import asyncio
import json
from datetime import datetime


class NewsAgent(STANBaseAgent):
    """Agent specialized in gathering news and current events."""
    
    def __init__(self):
        super().__init__(name="NewsAgent", category="News")
        self.system_prompt = "You are a news specialist focusing on current events and breaking news. Always provide accurate, timely information with verified sources."
    
    async def search_news(self, query: str) -> Dict[str, Any]:
        """Search for latest news about the topic."""
        prompt = f"Find the latest news about {query} from today or this week. Include specific dates, events, and credible source URLs."
        response = await self.generate_content(prompt)
        return {"news": response, "category": "news"}


class SocialMediaAgent(STANBaseAgent):
    """Agent specialized in social media content aggregation."""
    
    def __init__(self):
        super().__init__(name="SocialMediaAgent", category="Social Media")
        self.system_prompt = "You are a social media specialist tracking Twitter/X, Instagram, TikTok, and other platforms. Focus on viral content, trends, and fan engagement."
    
    async def search_social(self, query: str) -> Dict[str, Any]:
        """Search for social media activity."""
        prompt = f"Find recent social media posts, viral content, and fan reactions about {query}. Include platform names and engagement metrics if available."
        response = await self.generate_content(prompt)
        return {"social_content": response, "category": "social_media"}


class VideoContentAgent(STANBaseAgent):
    """Agent specialized in video content from YouTube, TikTok, etc."""
    
    def __init__(self):
        super().__init__(name="VideoAgent", category="Video")
        self.system_prompt = "You are a video content specialist tracking YouTube, TikTok, and streaming platforms. Focus on new releases, popular clips, and video trends."
    
    async def search_videos(self, query: str) -> Dict[str, Any]:
        """Search for video content."""
        prompt = f"Find recent YouTube videos, TikToks, or streaming content about {query}. Include video titles, view counts, and direct links."
        response = await self.generate_content(prompt)
        return {"videos": response, "category": "video"}


class FanCommunityAgent(STANBaseAgent):
    """Agent specialized in fan community discussions and reactions."""
    
    def __init__(self):
        super().__init__(name="FanAgent", category="Community")
        self.system_prompt = "You are a fan community specialist tracking Reddit, Discord, fan forums, and community reactions. Focus on fan theories, discussions, and community events."
    
    async def search_community(self, query: str) -> Dict[str, Any]:
        """Search fan community discussions."""
        prompt = f"Find recent fan discussions, theories, and community reactions about {query} from Reddit, forums, or fan sites."
        response = await self.generate_content(prompt)
        return {"community": response, "category": "fan_community"}


class UpcomingEventsAgent(STANBaseAgent):
    """Agent specialized in upcoming events and schedules."""
    
    def __init__(self):
        super().__init__(name="EventsAgent", category="Events")
        self.system_prompt = "You are an events specialist tracking upcoming schedules, releases, tours, and important dates. Focus on confirmed events with specific dates and locations."
    
    async def search_events(self, query: str) -> Dict[str, Any]:
        """Search for upcoming events."""
        prompt = f"Find upcoming events, schedules, releases, or important dates for {query}. Include specific dates, locations, and ticket/access information if available."
        response = await self.generate_content(prompt)
        return {"events": response, "category": "events"}


class SentimentAnalysisAgent(STANBaseAgent):
    """Agent for analyzing sentiment and fan reactions."""

    def __init__(self):
        super().__init__(name="SentimentAgent", category="Sentiment")
        self.system_prompt = "You are a sentiment analysis specialist. Analyze the emotional tone and fan reactions to news and events."

    async def analyze_sentiment(self, content: str, stan_name: str) -> Dict[str, Any]:
        """Analyze sentiment of content about a stan."""
        prompt = f"""Analyze the overall sentiment and fan reactions to this content about {stan_name}:

{content}

Provide:
1. Overall sentiment (positive/negative/neutral with percentage)
2. Key emotional themes
3. Notable fan reactions

Keep it brief (2-3 sentences) with emojis."""
        response = await self.generate_content(prompt)
        return {"sentiment": response, "category": "sentiment"}


class TrendingAgent(STANBaseAgent):
    """Agent for identifying trending topics and viral content."""

    def __init__(self):
        super().__init__(name="TrendingAgent", category="Trending")
        self.system_prompt = "You are a trend specialist tracking viral content, hashtags, and trending topics."

    async def find_trending(self, query: str) -> Dict[str, Any]:
        """Find trending topics and viral content."""
        prompt = f"""What's currently trending about {query}? Find:

1. Viral tweets/posts with high engagement
2. Trending hashtags
3. Viral moments or memes

Focus on content from the last 24-48 hours. Include engagement metrics if available."""
        response = await self.generate_content(prompt)
        return {"trending": response, "category": "trending"}


class RecommendationAgent(STANBaseAgent):
    """Agent for personalized recommendations."""

    def __init__(self):
        super().__init__(name="RecommendationAgent", category="Recommendations")
        self.system_prompt = "You are a recommendation specialist suggesting related content, artists, and topics."

    async def get_recommendations(self, stan_name: str, user_history: List[str] = None) -> Dict[str, Any]:
        """Generate personalized recommendations."""
        history_context = f"User also follows: {', '.join(user_history)}" if user_history else ""

        prompt = f"""Based on interest in {stan_name}, recommend:

1. Similar artists/topics they might enjoy
2. Related content to explore
3. Upcoming events or releases they shouldn't miss

{history_context}

Provide 3-4 specific recommendations with brief reasons."""
        response = await self.generate_content(prompt)
        return {"recommendations": response, "category": "recommendations"}


class BriefingOrchestrator:
    """Main orchestrator using ADK's multi-agent capabilities with enhanced features."""

    def __init__(self):
        self.news_agent = NewsAgent()
        self.social_agent = SocialMediaAgent()
        self.video_agent = VideoContentAgent()
        self.fan_agent = FanCommunityAgent()
        self.events_agent = UpcomingEventsAgent()
        self.multimodal_agent = MultimodalAgent()
        self.voice_agent = VoiceAgent()
        self.sentiment_agent = SentimentAnalysisAgent()
        self.trending_agent = TrendingAgent()
        self.recommendation_agent = RecommendationAgent()

        # Create ADK workflow agent for orchestration
        self.orchestrator = self._create_orchestrator()
    
    def _create_orchestrator(self):
        """Create orchestrator for parallel agent execution."""
        # We'll use asyncio for parallel execution instead of ADK's workflow
        return None  # Orchestration handled in generate_comprehensive_briefing
    
    async def generate_comprehensive_briefing(
        self,
        stan_data: Dict[str, Any],
        custom_settings: Optional[Dict] = None,
        user_history: Optional[List[str]] = None,
        include_recommendations: bool = True
    ) -> Dict[str, Any]:
        """Generate comprehensive briefing using all specialized agents with AI personalization."""

        stan_name = stan_data.get("name", "")
        tasks = []
        task_names = []

        # Determine which agents to use based on custom settings
        if not custom_settings or custom_settings.get("include_news", True):
            tasks.append(self.news_agent.search_news(stan_name))
            task_names.append("news")

        if not custom_settings or custom_settings.get("include_social_media", True):
            tasks.append(self.social_agent.search_social(stan_name))
            task_names.append("social")

        if not custom_settings or custom_settings.get("include_videos", True):
            tasks.append(self.video_agent.search_videos(stan_name))
            task_names.append("video")

        if not custom_settings or custom_settings.get("include_fan_reactions", True):
            tasks.append(self.fan_agent.search_community(stan_name))
            task_names.append("fan")

        if not custom_settings or custom_settings.get("include_upcoming_events", True):
            tasks.append(self.events_agent.search_events(stan_name))
            task_names.append("events")

        # Add trending analysis
        if not custom_settings or custom_settings.get("include_trending", True):
            tasks.append(self.trending_agent.find_trending(stan_name))
            task_names.append("trending")

        # Run all agents in parallel using asyncio
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Combine results into structured briefing
        topics = []
        all_sources = []
        all_content_for_sentiment = []

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"Agent error: {result}")
                continue

            if isinstance(result, dict):
                category = result.get("category", "general")
                content_key = list(result.keys())[0]
                content = result.get(content_key, "")

                # Create topic from agent result
                topic = {
                    "title": self._get_topic_title(category),
                    "content": self._extract_content(content),
                    "sources": self._extract_sources(content),
                    "category": category,
                    "priority": self._calculate_priority(category, content)
                }
                topics.append(topic)
                all_sources.extend(topic["sources"])
                all_content_for_sentiment.append(content)

        # Sort topics by priority (trending and news first)
        topics.sort(key=lambda x: x.get("priority", 0), reverse=True)

        # Add sentiment analysis
        try:
            combined_content = " ".join(all_content_for_sentiment[:3])  # Analyze top 3
            sentiment_result = await self.sentiment_agent.analyze_sentiment(
                combined_content,
                stan_name
            )
            topics.append({
                "title": "💭 Fan Sentiment",
                "content": self._extract_content(sentiment_result["sentiment"]),
                "sources": [],
                "category": "sentiment",
                "priority": 4
            })
        except Exception as e:
            print(f"Sentiment analysis error: {e}")

        # Add personalized recommendations
        if include_recommendations:
            try:
                rec_result = await self.recommendation_agent.get_recommendations(
                    stan_name,
                    user_history
                )
                topics.append({
                    "title": "✨ You Might Also Like",
                    "content": self._extract_content(rec_result["recommendations"]),
                    "sources": [],
                    "category": "recommendations",
                    "priority": 1
                })
            except Exception as e:
                print(f"Recommendation error: {e}")

        # Generate AI summary from all content
        all_content = " ".join([t["content"] for t in topics])
        summary = await self._generate_smart_summary(stan_name, topics)

        # Add metadata
        metadata = {
            "generated_at": datetime.now().isoformat(),
            "agent_count": len(tasks),
            "topic_count": len(topics),
            "source_count": len(set(all_sources)),
            "model": "gemini-2.0-flash-exp",
            "features": ["multi-agent", "sentiment", "recommendations", "trending"]
        }

        return {
            "content": all_content,
            "summary": summary,
            "sources": list(set(all_sources)),  # Remove duplicates
            "topics": topics,
            "searchSources": list(set(all_sources)),
            "generated_by": "ADK Multi-Agent System v2.0",
            "metadata": metadata
        }

    def _calculate_priority(self, category: str, content: str) -> int:
        """Calculate priority score for topics."""
        priority_map = {
            "trending": 10,
            "news": 9,
            "events": 8,
            "video": 7,
            "social_media": 6,
            "fan_community": 5,
            "sentiment": 4,
            "recommendations": 1
        }
        base_priority = priority_map.get(category, 3)

        # Boost priority for breaking/urgent content
        if any(word in content.lower() for word in ["breaking", "just announced", "urgent", "viral"]):
            base_priority += 2

        return base_priority

    async def _generate_smart_summary(self, stan_name: str, topics: List[Dict]) -> str:
        """Generate an intelligent summary using AI."""
        try:
            # Get top 3 most important topics
            top_topics = sorted(topics, key=lambda x: x.get("priority", 0), reverse=True)[:3]

            topic_summaries = "\n".join([
                f"- {t['title']}: {t['content'][:100]}..."
                for t in top_topics
            ])

            prompt = f"""Create a brief, engaging summary (2-3 sentences) of today's briefing for {stan_name}:

{topic_summaries}

Make it concise, exciting, and include 1-2 relevant emojis. Start with the most important update."""

            summary_agent = STANBaseAgent(name="SummaryAgent")
            summary = await summary_agent.generate_content(prompt)
            return summary.strip()

        except Exception as e:
            print(f"Smart summary error: {e}")
            # Fallback to simple summary
            return topics[0]["content"][:200] + "..." if topics else "No updates available."
    
    def _get_topic_title(self, category: str) -> str:
        """Get formatted topic title based on category."""
        titles = {
            "news": "Latest News & Updates",
            "social_media": "Social Media Buzz",
            "video": "Video Content & Highlights",
            "fan_community": "Fan Reactions & Discussions",
            "events": "Upcoming Events & Schedule"
        }
        return titles.get(category, "General Update")
    
    def _extract_content(self, text: str) -> str:
        """Extract and format content from agent response."""
        # Clean and format the content
        if len(text) > 300:
            return text[:297] + "..."
        return text
    
    def _extract_sources(self, text: str) -> List[str]:
        """Extract URLs from text content."""
        import re
        # Simple URL extraction
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        urls = re.findall(url_pattern, text)
        return urls[:3] if urls else []  # Limit to 3 sources per topic