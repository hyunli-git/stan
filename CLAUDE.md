# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
STAN 2.0 is a modern daily AI briefings application for fan content aggregation. It features a React Native mobile app (Expo) with real-time streaming, voice features, and interactive chat, powered by a FastAPI backend with advanced multi-agent AI system using Google Gemini 2.5 Flash.

## Development Commands

### Backend (stan-backend/)
```bash
python main.py     # Start FastAPI development server on localhost:8000
pip install -r requirements.txt  # Install dependencies
```

### Mobile App (stan-mobile/)
```bash
npm start          # Start Expo development server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in web browser
npm install        # Install dependencies
```

## Architecture

### Backend API Structure
The backend uses FastAPI with Python async/await. Main file: `stan-backend/main.py`. Key endpoints:
- `/api/generate-briefing` - Core briefing generation using advanced multi-agent system
- `/api/generate-briefing-stream` - Real-time streaming briefing generation (SSE)
- `/api/daily-briefings` - Batch generation and retrieval of daily briefings
- `/api/prompts` - Custom prompt management for personalized briefings
- `/api/multimodal/analyze-image` - Image analysis with vision AI
- `/api/voice/generate` - Text-to-speech generation
- `/api/analytics/metrics` - Analytics and monitoring
- `/metrics` - Prometheus-compatible metrics

### Database Schema (Supabase/PostgreSQL)
Key tables:
- `profiles` - User profiles extending Supabase auth
- `stans` - User's followed topics with categories and priorities
- `briefings` - Generated daily briefings with content and sources
- `stan_prompts` - Custom prompt settings per user/stan
- `daily_briefings` - Cached daily briefings for all users
- `public_briefings` - Public briefings for non-authenticated users

### AI Integration (UPGRADED)
- **Primary Model**: Google Gemini 2.5 Flash (`gemini-2.0-flash-exp`) with Google Search grounding
- **Multi-Agent System**: 9 specialized agents (News, Social, Video, Fan, Events, Sentiment, Trending, Recommendation, Multimodal)
- **Streaming**: Real-time SSE streaming for progressive briefing generation
- **Multimodal**: Image analysis, video processing, voice synthesis
- **Briefing Format**: Structured JSON with topics, summaries, real source URLs, sentiment, and recommendations
- **Custom Prompts**: Full prompt customization system with variable substitution
- **Caching**: Redis-based caching for 90% faster repeat requests

### Key Patterns
1. **Supabase Client Creation**:
   - Backend: `stan-backend/database/supabase_client.py` for async operations
   - Mobile: `stan-mobile/lib/supabase.ts` for client-side operations

2. **Briefing Generation Flow**:
   - Fetch stan data → Check cache → Check custom prompts → Run multi-agent orchestrator → Parse structured response → Cache & store in database → Track analytics

3. **Response Structure**:
   ```python
   {
     "content": str,           # Full briefing text
     "summary": str,           # AI-generated smart summary
     "sources": List[str],     # All source URLs
     "topics": List[dict],     # Structured topics with priority
     "searchSources": List[str],
     "generated_by": str,
     "metadata": {
       "generated_at": str,
       "agent_count": int,
       "topic_count": int,
       "source_count": int,
       "model": "gemini-2.0-flash-exp",
       "features": List[str]
     }
   }
   ```

4. **Environment Variables Required**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_AI_API_KEY`
   - `REDIS_URL` (optional, for caching)
   - `ELEVENLABS_API_KEY` (optional, for TTS)

## New Services (Mobile)

### Streaming Service
Real-time briefing generation with progress tracking:
```typescript
import { streamingService } from './services/streamingService';

for await (const chunk of streamingService.generateBriefingStream(stan, userId)) {
  if (chunk.event === 'chunk') {
    // Update UI with new text
  } else if (chunk.event === 'complete') {
    // Briefing complete
  }
}
```

### Voice Service
Text-to-speech for briefings:
```typescript
import { voiceService } from './services/voiceService';

await voiceService.speakBriefing(text, {
  language: 'en-US',
  pitch: 1.0,
  rate: 0.9
});
```

### Notification Service
Push notifications for breaking news:
```typescript
import { notificationService } from './services/notificationService';

await notificationService.initialize();
await notificationService.scheduleDailyBriefing(9, 0);
await notificationService.sendBreakingNews(stanName, title, message);
```

## New Screens (Mobile)

### StreamingBriefingScreen
Real-time streaming briefing with:
- Progress bar and live updates
- Voice playback
- Interactive chat button
- Topic cards with sources
- Share functionality

### InteractiveBriefingScreen
Chat interface for briefings with:
- Natural language Q&A
- Quick action buttons
- Voice playback for responses
- Context-aware conversations

## Backend Agents

### Specialized Agents (`stan-backend/agents/specialized_agents.py`)
- `NewsAgent` - Latest news and breaking stories
- `SocialMediaAgent` - Twitter, Instagram, TikTok tracking
- `VideoContentAgent` - YouTube and video platforms
- `FanCommunityAgent` - Reddit, Discord, forums
- `UpcomingEventsAgent` - Schedules and releases
- `SentimentAnalysisAgent` - Fan emotion analysis
- `TrendingAgent` - Viral content detection
- `RecommendationAgent` - Personalized suggestions

### Multimodal Agent (`stan-backend/agents/multimodal_agent.py`)
- Image analysis with vision AI
- Video thumbnail processing
- Multi-image comparison
- Voice/audio features

### BriefingOrchestrator
Coordinates all agents in parallel using `asyncio.gather()` for comprehensive briefings with priority sorting and smart summarization.

## Performance Features

### Caching (`stan-backend/services/cache_service.py`)
```python
# Get or set with callback
result = await cache_service.get_or_set(
    key="briefing:user_123:stan_456",
    callback=generate_briefing_func,
    ttl=3600
)
```

### Analytics (`stan-backend/services/analytics_service.py`)
```python
# Track everything
analytics_service.track_briefing_generation(
    stan_name="BTS",
    user_id="user_123",
    duration_ms=1250,
    token_count=500
)

# Get metrics
summary = analytics_service.get_metrics_summary()
```

## Prompt Management System
The app includes a comprehensive prompt customization system (`PROMPT_MANAGEMENT.md`) allowing users to:
- Customize briefing focus areas, tone, and length
- Exclude specific topics
- Write fully custom prompts with variable substitution
- Toggle inclusion of social media, fan reactions, and upcoming events

## Deployment
- Backend: Vercel (with FastAPI adapter) or standard Python hosting
- Mobile app: Expo for iOS/Android builds
- Database: Supabase (PostgreSQL)
- Cache: Redis (optional, Upstash recommended)

## Migration from 1.0
See [UPGRADE-2026.md](UPGRADE-2026.md) for complete upgrade guide with:
- Feature comparison
- API changes
- Migration steps
- Performance improvements
