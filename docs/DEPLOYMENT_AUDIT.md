# STAN Project Deployment Audit & Fixes

## Issues Found & Fixed

### 1. Multiple Vercel Projects ✅ FIXED
**Issue**: Two different Vercel projects were configured:
- `stan` (prj_Csd3G5VAKyjKqCFs5amhxBNyPXkE) - Used by stan-backend
- `stan-project` (prj_moWjWdjDAWOUdltCKSARZ1U7exqI) - Was incorrectly created

**Fix**: 
- Linked root directory to `stan` project
- Deleted `stan-project` from Vercel completely
- All directories now use the same `stan` project ID
- All deployments consolidated to single project

### 2. Incorrect API URL in Mobile App ✅ FIXED
**Issue**: Mobile app was pointing to old deployment URL
- Was: `https://stan-kxbwm4vl5-haleys-projects-1932fed0.vercel.app`

**Fix**: 
- Updated to: `https://stan-6szgoiilh-haleys-projects-1932fed0.vercel.app`
- Added auto-detection for production vs development environment
- Fixed localhost port from 3001 to 3000

### 3. Page Routing Conflict ✅ FIXED
**Issue**: Next.js `page.tsx` was serving instead of Expo web build

**Fix**: 
- Renamed `app/page.tsx` to `app/page.tsx.bak`
- Configured rewrites to serve `public/index.html` for root path

### 4. Unnecessary Files & Directories ✅ CLEANED
**Removed**:
- `/stan-web-deploy` directory (duplicate deployment)
- `/stan-unified` directory (unused)
- `/app` directory in root (duplicate)
- Root `vercel.json`, `package.json`, `next.config.js` (duplicates)

### 5. Cron Jobs Configuration ✅ FIXED
**Issue**: Cron job configuration was in root vercel.json

**Fix**: 
- Moved cron configuration to `stan-backend/vercel.json`
- Daily briefing generation at 6 AM: `/api/generate-real-briefings`

## Current Deployment Structure

```
stan-project/
├── .vercel/               # Root also linked to "stan" project
├── stan-backend/          # ← Main deployment directory
│   ├── .vercel/           # Vercel project: "stan"
│   ├── vercel.json        # All deployment config here
│   ├── app/               # Next.js API routes
│   └── public/            # Expo web build served from here
└── stan-mobile/           # React Native app
    ├── .vercel/           # Also linked to "stan" project
    └── config/api.ts      # Updated API URL

All directories use the same Vercel project ID: prj_Csd3G5VAKyjKqCFs5amhxBNyPXkE
```

## Single Vercel Project Configuration

**Project Name**: `stan`  
**Project ID**: `prj_Csd3G5VAKyjKqCFs5amhxBNyPXkE`  
**Main URL**: `https://stan-6szgoiilh-haleys-projects-1932fed0.vercel.app`  
**Alias**: `https://stan-peach.vercel.app`

## Deployment Commands

Always deploy from `stan-backend` directory:
```bash
cd stan-backend
npx vercel --prod
```

To update alias:
```bash
npx vercel alias [deployment-url] stan-peach.vercel.app
```

## Environment Variables Required

In Vercel dashboard for the `stan` project:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_AI_API_KEY`

## API Endpoints

All API endpoints are available at:
- Production: `https://stan-6szgoiilh-haleys-projects-1932fed0.vercel.app/api/*`
- Local: `http://localhost:3000/api/*`

## Mobile App Configuration

The mobile app now correctly points to the production API when built for production (`__DEV__ === false`).