"""Main FastAPI application for STAN backend using Google ADK."""

import os
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, Response
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
import time
from dotenv import load_dotenv
import uvicorn

# Import agents
from agents.base_agent import BriefingAgent
from agents.specialized_agents import BriefingOrchestrator
from agents.multimodal_agent import MultimodalAgent, VoiceAgent
from database.supabase_client import SupabaseClient
from services.cache_service import cache_service, briefing_cache_key, daily_briefings_cache_key
from services.analytics_service import analytics_service

# Load environment variables
load_dotenv('.env.production')  # Load from production environment

# Configure Google AI globally
import google.generativeai as genai
google_api_key = os.getenv("GOOGLE_AI_API_KEY")
if google_api_key:
    genai.configure(api_key=google_api_key)
    print(f"Configured Google AI with key: {google_api_key[:10]}...")

# Initialize FastAPI app
app = FastAPI(
    title="STAN Backend API",
    description="AI-powered daily briefings using Google ADK multi-agent system",
    version="2.0.0"
)

# Configure CORS - allow all origins for web access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for public API
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agents and database
briefing_agent = BriefingAgent()
orchestrator = BriefingOrchestrator()
multimodal_agent = MultimodalAgent()
voice_agent = VoiceAgent()

# Initialize database client (make it optional for testing)
try:
    db_client = SupabaseClient()
except Exception as e:
    print(f"Warning: Database initialization failed: {e}")
    db_client = None


# Pydantic models
class Stan(BaseModel):
    id: str
    name: str
    categories: Dict[str, str]
    description: Optional[str] = None
    priority: Optional[int] = 1


class BriefingRequest(BaseModel):
    stan: Stan
    userId: Optional[str] = None
    use_multi_agent: Optional[bool] = True


class BriefingResponse(BaseModel):
    content: str
    summary: str
    sources: List[str]
    topics: List[Dict[str, Any]]
    searchSources: Optional[List[str]] = []
    generated_by: Optional[str] = "ADK Agent System"


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "STAN Backend API - Powered by Google ADK",
        "version": "2.0.0",
        "status": "operational"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "stan-backend-adk",
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/generate-briefing", response_model=BriefingResponse)
async def generate_briefing(request: BriefingRequest):
    """Generate a briefing for a specific stan using ADK agents."""
    try:
        # Get custom prompt if user is authenticated
        custom_prompt = None
        if request.userId and db_client:
            custom_prompt = await db_client.get_custom_prompt(
                user_id=request.userId,
                stan_id=request.stan.id
            )
        
        # Convert stan to dict
        stan_data = request.stan.dict()
        
        # Choose between multi-agent orchestrator or single agent
        if request.use_multi_agent:
            # Use multi-agent orchestrator for comprehensive briefing
            briefing = await orchestrator.generate_comprehensive_briefing(
                stan_data=stan_data,
                custom_settings=custom_prompt
            )
        else:
            # Use single briefing agent
            briefing = await briefing_agent.generate_briefing(
                stan_data=stan_data,
                custom_prompt=custom_prompt
            )
        
        # Store briefing in database if user is authenticated
        if request.userId and db_client:
            await db_client.store_briefing(
                user_id=request.userId,
                stan_id=request.stan.id,
                briefing_content=briefing
            )
        
        return BriefingResponse(**briefing)
    
    except Exception as e:
        print(f"Error generating briefing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-briefing-stream")
async def generate_briefing_stream(request: BriefingRequest):
    """Generate a briefing with real-time streaming."""
    async def event_generator():
        try:
            # Get custom prompt if user is authenticated
            custom_prompt = None
            if request.userId and db_client:
                custom_prompt = await db_client.get_custom_prompt(
                    user_id=request.userId,
                    stan_id=request.stan.id
                )

            stan_data = request.stan.dict()

            # Build the prompt
            if custom_prompt and custom_prompt.get("custom_prompt"):
                prompt = briefing_agent._apply_custom_prompt(
                    custom_prompt["custom_prompt"],
                    {
                        "date": briefing_agent.format_date(),
                        "stan_name": stan_data.get("name"),
                        "category": stan_data.get("categories", {}).get("name", "General"),
                        "custom_settings": custom_prompt
                    }
                )
            else:
                context = {
                    "stan_name": stan_data.get("name"),
                    "category": stan_data.get("categories", {}).get("name", "General"),
                    "description": stan_data.get("description", ""),
                    "date": briefing_agent.format_date()
                }
                prompt = briefing_agent._build_default_prompt(context, custom_prompt)

            # Stream the response
            yield {"event": "start", "data": {"status": "generating"}}

            full_text = ""
            async for chunk in briefing_agent.generate_content_stream(prompt):
                full_text += chunk
                yield {"event": "chunk", "data": {"text": chunk}}

            # Parse final result
            parsed = briefing_agent._parse_agent_response(full_text)
            yield {"event": "complete", "data": parsed}

        except Exception as e:
            yield {"event": "error", "data": {"error": str(e)}}

    return EventSourceResponse(event_generator())


@app.get("/api/daily-briefings/{user_id}")
async def get_daily_briefings(user_id: str):
    """Get all daily briefings for a user."""
    try:
        briefings = await db_client.get_user_briefings(user_id)
        return {"briefings": briefings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-daily-briefings")
async def generate_all_briefings(background_tasks: BackgroundTasks):
    """Generate daily briefings for all users (background task)."""
    
    async def generate_for_all_users():
        try:
            # Get all users with stans
            users = await db_client.get_all_users_with_stans()
            
            for user in users:
                for stan in user["stans"]:
                    try:
                        # Generate briefing using orchestrator
                        briefing = await orchestrator.generate_comprehensive_briefing(
                            stan_data=stan,
                            custom_settings=user.get("custom_settings")
                        )
                        
                        # Store in database
                        await db_client.store_daily_briefing(
                            user_id=user["id"],
                            stan_id=stan["id"],
                            briefing_content=briefing
                        )
                    except Exception as e:
                        print(f"Error generating briefing for {stan['name']}: {e}")
                        continue
        except Exception as e:
            print(f"Error in batch generation: {e}")
    
    # Add to background tasks
    background_tasks.add_task(generate_for_all_users)
    
    return {
        "message": "Daily briefing generation started",
        "status": "processing"
    }


@app.post("/api/clear-and-refresh")
async def clear_and_refresh(user_id: Optional[str] = None):
    """Clear old briefings and generate new ones."""
    try:
        # Clear old briefings
        if user_id:
            await db_client.clear_user_briefings(user_id)
        else:
            await db_client.clear_all_briefings()
        
        return {
            "message": "Briefings cleared successfully",
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/prompts/{user_id}/{stan_id}")
async def get_prompt(user_id: str, stan_id: str):
    """Get custom prompt for a specific stan."""
    try:
        prompt = await db_client.get_custom_prompt(user_id, stan_id)
        return {"prompt": prompt}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/prompts")
async def save_prompt(request: Dict[str, Any]):
    """Save or update custom prompt."""
    try:
        result = await db_client.save_custom_prompt(
            user_id=request["user_id"],
            stan_id=request["stan_id"],
            prompt_data=request["prompt_data"]
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/test-google-ai")
async def test_google_ai():
    """Test Google AI integration with ADK."""
    try:
        test_agent = BriefingAgent()
        response = await test_agent.generate_content("Hello, this is a test. Respond briefly.")
        return {
            "status": "success",
            "response": response,
            "model": "gemini-2.0-flash-exp via ADK"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


@app.get("/api/daily-briefings")
async def get_daily_briefings(userId: Optional[str] = None):
    """Get daily briefings for a user."""
    try:
        if userId and db_client:
            briefings = await db_client.get_user_briefings(userId)
            return {"briefings": briefings}
        else:
            # Return sample briefings for non-authenticated users
            return {"briefings": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/force-generate-briefings")
async def force_generate_briefings():
    """Force generate new briefings (for testing)."""
    return {
        "message": "Briefing generation triggered",
        "status": "success"
    }


@app.get("/api/sample-briefings")
async def get_sample_briefings():
    """Get sample briefings for non-authenticated users."""
    samples = [
        {
            "id": "sample-1",
            "name": "BTS",
            "category": "K-Pop",
            "briefing": {
                "content": "BTS continues to dominate global music charts with their latest releases...",
                "summary": "BTS making waves globally",
                "sources": ["https://www.google.com/search?q=BTS+news"],
                "topics": [
                    {
                        "title": "Chart Performance",
                        "content": "Latest album tops Billboard 200...",
                        "sources": []
                    }
                ]
            }
        }
    ]
    return {"samples": samples}


@app.get("/api/analytics/metrics")
async def get_metrics():
    """Get analytics metrics."""
    try:
        summary = analytics_service.get_metrics_summary()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/events")
async def get_recent_events(limit: int = 100):
    """Get recent analytics events."""
    try:
        events = analytics_service.get_recent_events(limit)
        return {"events": events}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/user/{user_id}")
async def get_user_analytics(user_id: str):
    """Get analytics for a specific user."""
    try:
        stats = analytics_service.get_user_stats(user_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/metrics")
async def prometheus_metrics():
    """Prometheus-compatible metrics endpoint."""
    try:
        metrics = analytics_service.export_metrics(format="prometheus")
        return Response(content=metrics, media_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/multimodal/analyze-image")
async def analyze_image(request: Dict[str, Any]):
    """Analyze an image for a stan."""
    try:
        image_data = request.get("image_data")
        context = request.get("context", "")

        result = await multimodal_agent.analyze_image(image_data, context)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/voice/generate")
async def generate_voice_briefing(request: Dict[str, Any]):
    """Generate voice briefing (TTS)."""
    try:
        text = request.get("text", "")
        voice_id = request.get("voice_id", "default")

        result = await voice_agent.generate_voice_briefing(text, voice_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Exception handler
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__}
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv("ENVIRONMENT") == "development"
    )