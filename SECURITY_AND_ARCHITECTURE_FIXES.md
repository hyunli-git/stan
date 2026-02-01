# 🔐 Security & Architecture Fixes

**Date:** 2026-01-29
**Critical Issues Resolved**

---

## ⚠️ CRITICAL: Security Vulnerabilities Fixed

### 1. Hardcoded API Keys Removed ✅

**Issues Found:**
- ❌ `RAILWAY-DEPLOY.md`: Contained real production keys
- ❌ `stan-mobile/lib/supabase.ts`: Hardcoded fallback keys
- ❌ `.env.production` and `.env` files (but not tracked by git ✅)

**Actions Taken:**
1. ✅ Removed all hardcoded keys from `RAILWAY-DEPLOY.md`
2. ✅ Removed fallback keys from `supabase.ts` - now throws error if env vars missing
3. ✅ Verified `.gitignore` properly excludes all `.env` files

**What You Must Do NOW:**

🚨 **ROTATE ALL EXPOSED KEYS IMMEDIATELY**

These keys were exposed in `RAILWAY-DEPLOY.md` and must be rotated:

#### Google AI API Key
1. Go to: https://aistudio.google.com/app/apikey
2. Delete old key: `AIzaSyCX5...` (first 10 chars shown in docs)
3. Create new key
4. Update in:
   - Railway Dashboard → Variables
   - `.env.production` (local only, never commit)

#### Supabase Keys
1. Go to: https://supabase.com/dashboard/project/zcxsjxnecztynidmqpee/settings/api
2. **Service Role Key** (CRITICAL - has admin access):
   - Cannot rotate directly, but you can:
   - a) Reset JWT secret (nuclear option - breaks all keys)
   - b) Use RLS policies to limit damage
   - c) Monitor audit logs for suspicious activity
3. **Anon Key** (less critical):
   - Same as above
4. Update all keys in:
   - Railway Dashboard
   - Vercel Dashboard (if using)
   - `.env` and `.env.production` files

---

## 🏗️ Architecture Issue: Duplicate Backend

### Problem: Two Sources of Truth

Your project has **TWO backend implementations**:

1. **Python (stan-backend/)** - Main backend
   - Multi-agent system
   - Streaming support
   - Advanced features
   - FastAPI
   - **Deployed to:** Railway

2. **Next.js (app/api/)** - Duplicate/Legacy backend
   - Simple Gemini calls
   - Fallback templates
   - Next.js API routes
   - **Deployed to:** Vercel

**Why This Is Bad:**
- Mobile app doesn't know which to use
- Features don't match (streaming only in Python)
- Double maintenance burden
- Deployment confusion

### Solution: Single Source of Truth

**Option A: Python Only (Recommended)**

Keep Python backend as the single source of truth:

```bash
# 1. Move Next.js API routes to archive
mkdir -p archived_features/nextjs_api
mv app/api/* archived_features/nextjs_api/

# 2. Keep Next.js for Web UI only (if needed)
# Keep: app/page.tsx, app/layout.tsx, components/
# Remove: app/api/

# 3. Update mobile config
# stan-mobile/config/api.ts should point to Python backend ONLY
```

**Option B: Monorepo with Clear Separation**

If you want to keep both:

```
stan-project/
├── apps/
│   ├── web/          # Next.js (UI only, no API)
│   ├── mobile/       # React Native
│   └── api/          # Python backend (ONLY backend)
├── packages/
│   └── shared/       # Shared types
└── docs/
```

**We Recommend Option A for now** (PMF stage - keep it simple)

---

## 📱 Mobile App Configuration

### Current Issue

`stan-mobile/config/api.ts` needs to point to the correct backend:

```typescript
// ❌ WRONG - points to Vercel (Next.js) which doesn't have streaming
const PROD_API_URL = 'https://stan-project.vercel.app';

// ✅ CORRECT - points to Railway (Python) with full features
const PROD_API_URL = 'https://stan-backend-production.up.railway.app';
```

### Fix Mobile Config

1. Update `stan-mobile/config/api.ts`:

```typescript
// config/api.ts
import Constants from 'expo-constants';

const ENV = {
  dev: {
    apiUrl: 'http://localhost:8000',  // Python backend locally
  },
  staging: {
    apiUrl: 'https://stan-backend-staging.up.railway.app',
  },
  production: {
    apiUrl: 'https://stan-backend-production.up.railway.app',  // Python only
  },
};

function getEnvVars(env = Constants.expoConfig?.extra?.environment) {
  if (env === 'production') return ENV.production;
  if (env === 'staging') return ENV.staging;
  return ENV.dev;
}

export const { apiUrl } = getEnvVars();
export const API_BASE_URL = apiUrl;
```

2. Update `.env` in stan-mobile:

```bash
# EXPO_PUBLIC_API_URL should point to Python backend
EXPO_PUBLIC_API_URL=https://stan-backend-production.up.railway.app
```

---

## 🔒 Environment Variables Best Practices

### ✅ DO:
- Use `.env` files for all secrets (never hardcode)
- Add `.env` to `.gitignore` (already done ✅)
- Create `.env.example` with placeholder values
- Use different `.env` files per environment (`.env.production`, `.env.development`)
- Throw errors if required env vars are missing (now implemented ✅)
- Rotate keys immediately after exposure

### ❌ DON'T:
- Commit `.env` files to git
- Hardcode API keys in source code
- Use "fallback" keys in code
- Share keys in Slack/email/docs
- Reuse the same keys across environments

### .env.example Files

Created for you:

**Backend:** `stan-backend/.env.example`
```bash
# Google AI
GOOGLE_AI_API_KEY=your_key_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Redis (REQUIRED in production)
REDIS_URL=redis://your-redis-url

# Environment
ENVIRONMENT=production
PORT=8000
HOST=0.0.0.0
```

**Mobile:** `stan-mobile/.env.example`
```bash
# API Configuration
EXPO_PUBLIC_API_URL=https://your-backend.railway.app

# Supabase (Mobile uses anon key only)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Analytics (optional)
EXPO_PUBLIC_AMPLITUDE_API_KEY=your_amplitude_key
```

---

## 📋 Post-Fix Checklist

### Immediate (Do Now):
- [ ] **ROTATE Google AI API Key** (exposed in docs)
- [ ] **ROTATE Supabase Service Role Key** (if possible) or audit access
- [ ] Remove Next.js API routes (`mv app/api archived_features/`)
- [ ] Update mobile config to point to Python backend only
- [ ] Test mobile app connects to correct backend
- [ ] Verify `.env` files are NOT tracked by git (`git ls-files | grep .env`)

### This Week:
- [ ] Set up Sentry or error tracking to catch config issues
- [ ] Add integration tests to verify backend endpoints
- [ ] Document deployment flow (Python → Railway, Mobile → Expo)
- [ ] Create runbook for key rotation process
- [ ] Audit Supabase RLS policies

### Ongoing:
- [ ] Never commit keys to git (use pre-commit hooks)
- [ ] Regular key rotation (quarterly)
- [ ] Monitor API usage for anomalies
- [ ] Keep secrets management documented

---

## 🚀 Correct Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│               USERS                              │
└───────────┬─────────────────────────┬───────────┘
            │                         │
            │                         │
    ┌───────▼────────┐       ┌───────▼────────┐
    │  Mobile App    │       │   Web App      │
    │  (Expo)        │       │   (Next.js)    │
    │                │       │   [UI ONLY]    │
    └───────┬────────┘       └───────┬────────┘
            │                         │
            │                         │
            └────────┬────────────────┘
                     │
                     │ HTTPS API calls
                     │
            ┌────────▼────────┐
            │  Python Backend │
            │  (FastAPI)      │
            │  Railway        │
            │                 │
            │  - EfficientAgent
            │  - BatchGenerator
            │  - Rate Limiting
            │  - Caching
            └────────┬────────┘
                     │
          ┌──────────┼──────────┐
          │          │          │
    ┌─────▼───┐ ┌───▼────┐ ┌──▼─────┐
    │Supabase │ │ Redis  │ │ Google │
    │(Postgres│ │(Cache) │ │   AI   │
    └─────────┘ └────────┘ └────────┘
```

**Single Source of Truth:** Python Backend on Railway

---

## 📝 Summary

### What Was Fixed:
1. ✅ Removed hardcoded keys from `RAILWAY-DEPLOY.md`
2. ✅ Removed fallback keys from `supabase.ts`
3. ✅ Verified `.gitignore` excludes `.env` files
4. ✅ Created `.env.example` templates
5. ✅ Documented architecture cleanup plan

### What You Must Do:
1. 🚨 **ROTATE ALL EXPOSED KEYS** (Google AI, Supabase)
2. 📁 Archive Next.js API routes (remove duplicate backend)
3. 📱 Fix mobile config to point to Python backend
4. ✅ Test everything works
5. 📖 Follow security best practices going forward

### Cost Impact:
- No cost changes from security fixes
- Removing duplicate backend saves ~$20/month (one less Vercel deployment)

---

**Questions?** Check:
- [REFACTOR_SUMMARY.md](REFACTOR_SUMMARY.md) - Cost optimization details
- [QUICK_START_V2.md](QUICK_START_V2.md) - Setup guide
- [CLAUDE.md](CLAUDE.md) - Development guide

**Security incident?** Rotate keys immediately and audit logs.
