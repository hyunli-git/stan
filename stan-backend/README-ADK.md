# STAN Backend - Google ADK Version

## Overview
This is a complete rewrite of the STAN backend using Google's Agent Development Kit (ADK) with a multi-agent architecture. The system replaces the Next.js API with a FastAPI Python backend powered by specialized AI agents.

## Architecture

### Multi-Agent System
- **BriefingAgent**: Main orchestrator for briefing generation
- **NewsAgent**: Specialized in gathering current news and events
- **SocialMediaAgent**: Tracks social media activity across platforms
- **VideoContentAgent**: Aggregates YouTube, TikTok, and streaming content
- **FanCommunityAgent**: Monitors fan discussions and reactions
- **UpcomingEventsAgent**: Tracks schedules and upcoming events

### Technology Stack
- **Framework**: FastAPI (Python)
- **AI**: Google ADK with Gemini 2.0 Flash
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel/Docker

## Installation

1. **Install Python 3.11+**

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your API keys:
   - `GOOGLE_AI_API_KEY`: Your Google AI API key
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

4. **Run the server**:
   ```bash
   ./start.sh
   # or manually:
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## API Endpoints

### Core Endpoints
- `POST /api/generate-briefing`: Generate briefing for a specific stan
- `GET /api/daily-briefings/{user_id}`: Get user's daily briefings
- `POST /api/generate-daily-briefings`: Batch generate for all users
- `POST /api/clear-and-refresh`: Clear old briefings

### Prompt Management
- `GET /api/prompts/{user_id}/{stan_id}`: Get custom prompt
- `POST /api/prompts`: Save/update custom prompt

### Testing
- `GET /api/health`: Health check
- `GET /api/test-google-ai`: Test Google AI integration
- `GET /api/sample-briefings`: Get sample briefings

## Features

### ADK Integration
- Leverages Google's production-grade agent framework
- Multi-agent orchestration for comprehensive briefings
- Parallel agent execution for faster processing
- Built-in web search grounding with Gemini

### Agent Capabilities
Each specialized agent can:
- Search the web for real-time information
- Process and structure content
- Extract relevant sources and media
- Work in parallel with other agents

### Customization
- Custom prompts per stan
- Configurable tone, length, and focus areas
- Ability to exclude specific topics
- Toggle individual content sections

## Development

### Adding New Agents
1. Create new agent class in `agents/specialized_agents.py`
2. Inherit from `STANBaseAgent`
3. Implement specialized search methods
4. Add to `BriefingOrchestrator`

### Testing Agents
```python
# Test individual agent
from agents.specialized_agents import NewsAgent

agent = NewsAgent()
result = await agent.search_news("BTS")
print(result)
```

## Deployment

### Docker
```bash
docker build -t stan-adk-backend .
docker run -p 8000:8000 --env-file .env.local stan-adk-backend
```

### Vercel
```bash
vercel --prod
```

## Migration from Next.js

This ADK version maintains API compatibility with the existing frontend while providing:
- Better scalability through multi-agent architecture
- More comprehensive briefings from specialized agents
- Faster response times with parallel processing
- Production-grade reliability with Google ADK

## Environment Variables

```env
# Google AI
GOOGLE_AI_API_KEY=your_api_key_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# Server
PORT=8000
HOST=0.0.0.0
ENVIRONMENT=development

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
```

## Performance

The ADK multi-agent system provides:
- **Parallel Processing**: All agents run simultaneously
- **Caching**: Built-in response caching
- **Streaming**: Support for real-time updates
- **Scalability**: Handles multiple users efficiently

## Support

For issues or questions about the ADK implementation, please refer to:
- [Google ADK Documentation](https://google.github.io/adk-docs/)
- [STAN Project Issues](https://github.com/your-repo/issues)