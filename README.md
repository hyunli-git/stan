# STAN - Daily AI Briefings

Daily AI briefings for everything you stan. AI-powered aggregation of updates across platforms into personalized fan briefings.

## Project Structure

```
stan-project/
├── stan-mobile/        # React Native mobile app (Expo)
└── stan-backend/       # Next.js backend API & potential web app
```

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Supabase account (create at https://supabase.com)
- Vercel account (for deployment)

### 1. Supabase Setup
1. Create a new Supabase project
2. Copy your project URL and anon key from Settings > API

### 2. Mobile App Setup
```bash
cd stan-mobile
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
npm install
npm start
```

### 3. Backend Setup
```bash
cd stan-backend
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
npm install
npm run dev
```

### 4. Test the Setup
- Mobile app: Scan QR code with Expo Go app
- Backend API: Visit http://localhost:3000/api/health

## Tech Stack
- **Mobile**: React Native + Expo + TypeScript
- **Backend**: Next.js + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Hosting**: Vercel (backend)
- **Styling**: Tailwind CSS (backend)

## Next Steps
1. Set up Supabase database schema
2. Implement authentication flow
3. Create API endpoints for content aggregation
4. Build core UI components
5. Integrate social media APIs