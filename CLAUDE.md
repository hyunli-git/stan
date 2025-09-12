# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
STAN is a daily AI briefings application for fan content aggregation. It consists of a React Native mobile app (Expo) and a Next.js backend API that generates personalized AI briefings for users about topics they "stan" (follow passionately).

## Development Commands

### Backend (stan-backend/)
```bash
npm run dev        # Start development server on localhost:3000
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

### Mobile App (stan-mobile/)
```bash
npm start          # Start Expo development server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in web browser
```

## Architecture

### Backend API Structure
The backend uses Next.js App Router with API routes in `stan-backend/app/api/`. Key endpoints:
- `/api/generate-briefing` - Core briefing generation using Google Gemini 2.0 Flash with web search grounding
- `/api/daily-briefings` - Batch generation and retrieval of daily briefings
- `/api/generate-real-briefings` - Production briefing generation with structured topics
- `/api/clear-and-refresh` - Clear old briefings and generate new ones
- `/api/prompts` - Custom prompt management for personalized briefings

### Database Schema (Supabase/PostgreSQL)
Key tables:
- `profiles` - User profiles extending Supabase auth
- `stans` - User's followed topics with categories and priorities
- `briefings` - Generated daily briefings with content and sources
- `stan_prompts` - Custom prompt settings per user/stan
- `daily_briefings` - Cached daily briefings for all users
- `public_briefings` - Public briefings for non-authenticated users

### AI Integration
- **Primary**: Google Gemini 2.0 Flash (`gemini-2.0-flash-exp`) with Google Search grounding for real-time web information
- **Briefing Format**: Structured JSON with topics, summaries, and real source URLs
- **Custom Prompts**: Full prompt customization system with variable substitution

### Key Patterns
1. **Supabase Client Creation**: 
   - Backend: `stan-backend/lib/supabase/server.ts` for server-side operations
   - Mobile: `stan-mobile/lib/supabase.ts` for client-side operations

2. **Briefing Generation Flow**:
   - Fetch stan data → Check for custom prompts → Generate with Gemini + web search → Parse structured response → Store in database

3. **Response Structure**:
   ```typescript
   interface BriefingContent {
     content: string;       // Full briefing text
     summary: string;       // Brief summary
     sources: string[];     // Source URLs
     topics: BriefingTopic[]; // Structured topics with individual sources
   }
   ```

4. **Environment Variables Required**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_AI_API_KEY`

## Prompt Management System
The app includes a comprehensive prompt customization system (`PROMPT_MANAGEMENT.md`) allowing users to:
- Customize briefing focus areas, tone, and length
- Exclude specific topics
- Write fully custom prompts with variable substitution
- Toggle inclusion of social media, fan reactions, and upcoming events

## Deployment
- Backend deployed on Vercel
- Mobile app built with Expo for iOS/Android
- Database hosted on Supabase