-- Create public_briefings table for caching daily briefings for popular stans
CREATE TABLE IF NOT EXISTS public_briefings (
  id TEXT PRIMARY KEY,
  stan_id TEXT NOT NULL,
  stan_name TEXT NOT NULL,
  stan_category TEXT NOT NULL,
  date DATE NOT NULL,
  topics JSONB NOT NULL,
  search_sources TEXT[] DEFAULT '{}',
  images JSONB DEFAULT '[]',
  stan_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one briefing per stan per day
  UNIQUE(stan_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_public_briefings_date ON public_briefings(date);
CREATE INDEX IF NOT EXISTS idx_public_briefings_stan_date ON public_briefings(stan_id, date);

-- No RLS needed - these are public briefings available to everyone