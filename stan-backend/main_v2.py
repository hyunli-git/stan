"""Main FastAPI application for STAN backend v2.

Optimized for cost and PMF validation:
- Single efficient agent (70% cost reduction)
- Batch generation for popular stans (90% cost reduction)
- Rate limiting to prevent abuse
- Structured logging for monitoring
- Redis caching required in production
"""

import os
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
import time
from dotenv import load_dotenv
import uvicorn

# Import new optimized agents
from agents.efficient_agent import EfficientBriefingAgent
from agents.batch_generator import BatchBriefingGenerator, POPULAR_STANS
from database.supabase_client import SupabaseClient
from services.cache_service import cache_service

# Import middleware and config
from middleware.rate_limiter import (
    init_rate_limiter,
    briefing_rate_limit,
    api_rate_limit
)
from config.logging_config import (
    configure_logging,
    get_logger,
    log_api_request,
    log_briefing_generation,
    log_error
)

# Load environment variables
env = os.getenv("ENVIRONMENT", "development")
if env == "production":
    load_dotenv('.env.production')
else:
    load_dotenv()

# Configure logging
configure_logging(environment=env)
logger = get_logger(__name__)

# Validate required environment variables
REQUIRED_ENV_VARS = [
    "GOOGLE_AI_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
]

# Redis is REQUIRED in production for cost optimization
if env == "production":
    REQUIRED_ENV_VARS.append("REDIS_URL")

missing_vars = [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]
if missing_vars:
    error_msg = f"Missing required environment variables: {', '.join(missing_vars)}"
    logger.error("startup_failed", error=error_msg)
    raise RuntimeError(error_msg)

# Configure Google AI globally
import google.generativeai as genai
google_api_key = os.getenv("GOOGLE_AI_API_KEY")
genai.configure(api_key=google_api_key)
logger.info("google_ai_configured", key_prefix=google_api_key[:10])

# Initialize FastAPI app
app = FastAPI(
    title="STAN Backend API v2",
    description="Optimized AI-powered daily briefings",
    version="2.0.0"
)

# Configure CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8081").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
efficient_agent = EfficientBriefingAgent()
batch_generator = BatchBriefingGenerator(agent=efficient_agent)

# Initialize database client
try:
    db_client = SupabaseClient()
    logger.info("database_initialized")
except Exception as e:
    logger.error("database_init_failed", error=str(e))
    db_client = None

# Initialize rate limiter with Redis
try:
    redis_client = cache_service.redis if hasattr(cache_service, 'redis') else None
    init_rate_limiter(redis_client)
    logger.info("rate_limiter_initialized", redis_enabled=redis_client is not None)
except Exception as e:
    logger.warning("rate_limiter_init_fallback", error=str(e))
    init_rate_limiter()  # Fallback to memory-based


# Pydantic models
class Stan(BaseModel):
    id: Optional[str] = None
    name: str
    categories: Optional[Dict[str, str]] = None
    description: Optional[str] = None
    priority: Optional[int] = 1


class BriefingRequest(BaseModel):
    stan: Stan
    userId: Optional[str] = None


class BriefingResponse(BaseModel):
    content: str
    summary: str
    sources: List[str]
    topics: List[Dict[str, Any]]
    searchSources: Optional[List[str]] = []
    generated_by: str
    metadata: Optional[Dict[str, Any]] = None


# Middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all API requests with timing."""
    start_time = time.time()

    # Extract user_id if available (from query params or headers)
    user_id = request.query_params.get("userId") or request.headers.get("x-user-id")
    request.state.user_id = user_id

    try:
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000

        log_api_request(
            method=request.method,
            path=request.url.path,
            user_id=user_id,
            status_code=response.status_code,
            duration_ms=duration_ms
        )

        return response
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        log_error(
            error_type="request_failed",
            error_message=str(e),
            context={
                "method": request.method,
                "path": request.url.path,
                "user_id": user_id,
                "duration_ms": duration_ms
            }
        )
        raise


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "STAN Backend API v2 - Optimized for PMF",
        "version": "2.0.0",
        "status": "operational",
        "features": ["efficient_agent", "batch_generation", "rate_limiting", "structured_logging"]
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    health = {
        "status": "healthy",
        "service": "stan-backend-v2",
        "timestamp": datetime.now().isoformat(),
        "environment": env,
        "redis": "connected" if cache_service.redis else "disconnected",
        "database": "connected" if db_client else "disconnected"
    }

    return health


@app.get("/api/popular-stans")
async def get_popular_stans():
    """Get list of popular stans (batch-generated, free for all users)."""
    return {
        "popular_stans": POPULAR_STANS,
        "total": sum(len(stans) for stans in POPULAR_STANS.values()),
        "message": "These stans are generated daily and free for all users"
    }


@app.post("/api/generate-briefing", response_model=BriefingResponse, dependencies=[Depends(briefing_rate_limit)])
async def generate_briefing(request: BriefingRequest):
    """Generate a briefing for a specific stan.

    Rate limited to 5 requests per hour per user.
    Popular stans are served from cache (free).
    Custom stans require userId and count toward rate limit.
    """
    start_time = datetime.now()

    try:
        stan_name = request.stan.name
        user_id = request.userId

        logger.info("briefing_requested",
                   stan_name=stan_name,
                   user_id=user_id,
                   is_popular=batch_generator.is_popular_stan(stan_name))

        # Use batch generator (handles caching automatically)
        briefing = await batch_generator.get_briefing(
            stan_name=stan_name,
            user_id=user_id
        )

        # Track generation
        duration_ms = (datetime.now() - start_time).total_seconds() * 1000
        log_briefing_generation(
            stan_name=stan_name,
            user_id=user_id or "anonymous",
            duration_ms=duration_ms,
            agent_type="efficient_agent",
            cost_usd=0.08,  # Estimated cost
            success=True
        )

        # Store briefing read event if user is authenticated
        if user_id and db_client:
            try:
                # Update last_read timestamp in user_stans_v2
                await db_client.execute_query(
                    "SELECT update_briefing_read(%s, %s)",
                    (user_id, stan_name)
                )
            except Exception as e:
                logger.warning("failed_to_update_read_tracking", error=str(e))

        return BriefingResponse(**briefing)

    except Exception as e:
        duration_ms = (datetime.now() - start_time).total_seconds() * 1000
        log_briefing_generation(
            stan_name=request.stan.name,
            user_id=request.userId or "anonymous",
            duration_ms=duration_ms,
            agent_type="efficient_agent",
            cost_usd=0.0,
            success=False,
            error=str(e)
        )

        logger.error("briefing_generation_failed",
                    stan_name=request.stan.name,
                    user_id=request.userId,
                    error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/batch/generate-popular")
async def trigger_batch_generation(background_tasks: BackgroundTasks):
    """Trigger batch generation of popular stans (admin/cron only).

    This should be called by a cron job at 6am daily.
    Generates all popular stans once, serves to many users.
    """
    # TODO: Add authentication for this endpoint (only allow admin/cron)

    async def run_batch():
        logger.info("batch_generation_triggered")
        stats = await batch_generator.generate_popular_briefings_daily()
        logger.info("batch_generation_completed", **stats)

    background_tasks.add_task(run_batch)

    return {
        "message": "Batch generation started",
        "status": "processing",
        "popular_stans_count": len(batch_generator.popular_stan_list)
    }


@app.get("/api/user/stans/{user_id}", dependencies=[Depends(api_rate_limit)])
async def get_user_stans(user_id: str):
    """Get all stans a user follows."""
    try:
        if not db_client:
            raise HTTPException(status_code=503, detail="Database unavailable")

        # Query user_stans_v2 table
        stans = await db_client.get_user_stans(user_id)

        return {
            "user_id": user_id,
            "stans": stans,
            "count": len(stans)
        }
    except Exception as e:
        logger.error("failed_to_get_user_stans", user_id=user_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/user/stans", dependencies=[Depends(api_rate_limit)])
async def add_user_stan(request: Dict[str, Any]):
    """Add a stan to user's list."""
    try:
        user_id = request.get("user_id")
        stan_name = request.get("stan_name")

        if not user_id or not stan_name:
            raise HTTPException(status_code=400, detail="user_id and stan_name required")

        if not db_client:
            raise HTTPException(status_code=503, detail="Database unavailable")

        # Insert into user_stans_v2
        await db_client.add_user_stan(user_id, stan_name)

        logger.info("user_stan_added", user_id=user_id, stan_name=stan_name)

        return {
            "status": "success",
            "message": f"Added {stan_name} to your stans"
        }
    except Exception as e:
        logger.error("failed_to_add_user_stan", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/user/stans/{user_id}/{stan_name}", dependencies=[Depends(api_rate_limit)])
async def remove_user_stan(user_id: str, stan_name: str):
    """Remove a stan from user's list."""
    try:
        if not db_client:
            raise HTTPException(status_code=503, detail="Database unavailable")

        await db_client.remove_user_stan(user_id, stan_name)

        logger.info("user_stan_removed", user_id=user_id, stan_name=stan_name)

        return {
            "status": "success",
            "message": f"Removed {stan_name} from your stans"
        }
    except Exception as e:
        logger.error("failed_to_remove_user_stan", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/briefings/today")
async def get_todays_briefings(userId: Optional[str] = None):
    """Get today's briefings for a user."""
    try:
        if not userId:
            # Return sample popular stan briefings
            sample_stans = ["BTS", "BlackPink", "Taylor Swift"]
            briefings = []

            for stan_name in sample_stans:
                try:
                    briefing = await batch_generator.get_briefing(stan_name)
                    briefings.append({
                        "stan_name": stan_name,
                        "briefing": briefing
                    })
                except:
                    continue

            return {"briefings": briefings, "count": len(briefings)}

        # Get user's stans and their briefings
        user_stans = await db_client.get_user_stans(userId)
        briefings = []

        for stan in user_stans:
            try:
                briefing = await batch_generator.get_briefing(
                    stan_name=stan["stan_name"],
                    user_id=userId
                )
                briefings.append({
                    "stan_name": stan["stan_name"],
                    "briefing": briefing,
                    "last_read_at": stan.get("last_read_at")
                })
            except Exception as e:
                logger.warning("failed_to_get_briefing_for_stan",
                             stan_name=stan["stan_name"],
                             error=str(e))
                continue

        return {
            "briefings": briefings,
            "count": len(briefings)
        }

    except Exception as e:
        logger.error("failed_to_get_todays_briefings", user_id=userId, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/test-google-ai")
async def test_google_ai():
    """Test Google AI integration."""
    try:
        test_result = await efficient_agent.generate_briefing("Test")
        return {
            "status": "success",
            "model": "gemini-2.0-flash-exp",
            "agent": "efficient_agent"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


# Exception handler
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Global exception handler with logging."""
    log_error(
        error_type=type(exc).__name__,
        error_message=str(exc),
        context={
            "method": request.method,
            "path": request.url.path
        }
    )

    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__}
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")

    logger.info("server_starting",
               host=host,
               port=port,
               environment=env)

    uvicorn.run(
        "main_v2:app",
        host=host,
        port=port,
        reload=(env == "development")
    )
