"""Base agent configuration for STAN briefing system using Google ADK."""

import os
from typing import Dict, List, Any, Optional
import google.adk as genai_adk
from google.generativeai import GenerativeModel, configure
import google.generativeai as genai
from datetime import datetime

class STANBaseAgent:
    """Base agent class for STAN briefing generation."""
    
    def __init__(self, name: str, category: Optional[str] = None):
        self.name = name
        self.category = category
        self.model = self._initialize_model()
        
    def _initialize_model(self):
        """Initialize Gemini 2.5 Flash model with latest configuration."""
        # API key should be configured globally in main.py
        # Use Gemini 2.5 Flash for better performance and lower cost
        return genai.GenerativeModel(
            model_name="gemini-2.0-flash-exp",  # Will be updated to 2.5 when available
            generation_config={
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 2048,
                "response_mime_type": "application/json"
            }
        )
    
    async def generate_content(self, prompt: str) -> str:
        """Generate content using the configured model."""
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            print(f"Error generating content: {e}")
            raise

    async def generate_content_stream(self, prompt: str):
        """Generate content with streaming support."""
        try:
            response = self.model.generate_content(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            print(f"Error in streaming generation: {e}")
            raise
    
    def format_date(self) -> str:
        """Get formatted current date."""
        return datetime.now().strftime("%A, %B %d, %Y")


class BriefingAgent(STANBaseAgent):
    """Main agent for generating briefings using ADK framework."""
    
    def __init__(self):
        super().__init__(name="BriefingAgent")
        self.agent = self._create_adk_agent()
    
    def _create_adk_agent(self):
        """Create ADK agent with tools and configuration."""
        # For now, we'll use direct Gemini model since ADK's Agent API is different
        # ADK is more for orchestration, we'll use it in the orchestrator
        return None  # We'll use direct model calls for now
    
    async def _web_search(self, query: str) -> Dict[str, Any]:
        """Web search tool for ADK agent."""
        # This will use Gemini's grounding with Google Search
        prompt = f"Search the web for: {query}. Return current information with source URLs."
        response = await self.generate_content(prompt)
        return {"results": response}
    
    def _format_briefing(self, content: str, stan_name: str) -> Dict[str, Any]:
        """Format briefing into structured response."""
        return {
            "stan_name": stan_name,
            "date": self.format_date(),
            "content": content,
            "formatted": True
        }
    
    async def generate_briefing(self, stan_data: Dict[str, Any], custom_prompt: Optional[Dict] = None) -> Dict[str, Any]:
        """Generate a complete briefing for a stan using ADK agent orchestration."""
        
        stan_name = stan_data.get("name", "")
        category = stan_data.get("categories", {}).get("name", "General")
        description = stan_data.get("description", "")
        
        # Build context for the agent
        context = {
            "stan_name": stan_name,
            "category": category,
            "description": description,
            "date": self.format_date(),
            "custom_settings": custom_prompt or {}
        }
        
        # Create the main prompt
        if custom_prompt and custom_prompt.get("custom_prompt"):
            prompt = self._apply_custom_prompt(custom_prompt["custom_prompt"], context)
        else:
            prompt = self._build_default_prompt(context, custom_prompt)
        
        # Execute agent with ADK framework
        try:
            # Use direct Gemini model with grounding
            result = await self.generate_content(prompt)
            
            # Parse and structure the response
            briefing_content = self._parse_agent_response(result)
            
            return briefing_content
            
        except Exception as e:
            print(f"Error in ADK agent execution: {e}")
            # Fallback to direct model generation
            return await self._fallback_generation(stan_data)
    
    def _build_default_prompt(self, context: Dict, custom_settings: Optional[Dict]) -> str:
        """Build default prompt with customizations."""
        sections = []
        
        if not custom_settings or custom_settings.get("include_social_media", True):
            sections.append("Recent social media activity and posts")
        if not custom_settings or custom_settings.get("include_fan_reactions", True):
            sections.append("Fan and community reactions")
        if not custom_settings or custom_settings.get("include_upcoming_events", True):
            sections.append("Upcoming schedules, events, or releases")
        sections.append("Recent news or activities")
        
        focus_areas = ""
        if custom_settings and custom_settings.get("focus_areas"):
            focus_areas = f"Focus specifically on: {', '.join(custom_settings['focus_areas'])}"
        
        exclude_topics = ""
        if custom_settings and custom_settings.get("exclude_topics"):
            exclude_topics = f"Please avoid mentioning: {', '.join(custom_settings['exclude_topics'])}"
        
        prompt = f"""Today is {context['date']}. Search the web for the most current information about "{context['stan_name']}" and create a briefing.

Category: {context['category']}
Description: {context.get('description', 'None')}
{focus_areas}
{exclude_topics}

Please write in JSON format with separate topics:
{{
  "topics": [
    {{
      "title": "Topic Title",
      "content": "2-3 sentences with specific details and emojis",
      "sources": ["url1", "url2"]
    }}
  ],
  "summary": "Brief overview",
  "searchSources": ["all found URLs"]
}}

Include sections for: {', '.join(sections)}
Tone: {custom_settings.get('tone', 'informative') if custom_settings else 'informative'}
"""
        return prompt
    
    def _apply_custom_prompt(self, custom_prompt: str, context: Dict) -> str:
        """Apply variable substitution to custom prompt."""
        return custom_prompt.replace(
            '{date}', context['date']
        ).replace(
            '{stan_name}', context['stan_name']
        ).replace(
            '{category}', context['category']
        ).replace(
            '{focus_areas}', ', '.join(context.get('custom_settings', {}).get('focus_areas', []))
        ).replace(
            '{tone}', context.get('custom_settings', {}).get('tone', 'informative')
        )
    
    def _parse_agent_response(self, response: Any) -> Dict[str, Any]:
        """Parse ADK agent response into structured briefing format."""
        import json
        
        try:
            # Try to extract JSON from response
            response_text = str(response)
            
            # Find JSON in response
            json_match = response_text[response_text.find('{'):response_text.rfind('}')+1]
            if json_match:
                parsed = json.loads(json_match)
                
                return {
                    "content": response_text,  # Keep full text for compatibility
                    "summary": parsed.get("summary", ""),
                    "sources": parsed.get("searchSources", []),
                    "topics": parsed.get("topics", []),
                    "searchSources": parsed.get("searchSources", [])
                }
        except:
            pass
        
        # Fallback structure
        return {
            "content": response_text,
            "summary": response_text[:200] + "..." if len(response_text) > 200 else response_text,
            "sources": [],
            "topics": [],
            "searchSources": []
        }
    
    async def _fallback_generation(self, stan_data: Dict) -> Dict[str, Any]:
        """Fallback generation without ADK orchestration."""
        prompt = f"Generate a brief update about {stan_data.get('name')} for today, {self.format_date()}."
        content = await self.generate_content(prompt)
        
        return {
            "content": content,
            "summary": content[:200] + "..." if len(content) > 200 else content,
            "sources": [],
            "topics": []
        }