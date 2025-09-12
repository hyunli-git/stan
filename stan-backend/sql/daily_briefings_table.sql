-- Create daily_briefings table to store pre-generated briefings
CREATE TABLE IF NOT EXISTS daily_briefings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stan_id UUID NOT NULL REFERENCES stans(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content JSONB NOT NULL, -- Full briefing content for backward compatibility
  topics JSONB NOT NULL, -- Array of topics [{title, content, sources, images}]
  search_sources TEXT[] DEFAULT '{}', -- Array of actual source URLs from search
  images JSONB DEFAULT '[]', -- Array of image objects [{url, alt, source, thumbnail}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one briefing per stan per day
  UNIQUE(stan_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_briefings_date ON daily_briefings(date);
CREATE INDEX IF NOT EXISTS idx_daily_briefings_stan_id ON daily_briefings(stan_id);
CREATE INDEX IF NOT EXISTS idx_daily_briefings_stan_date ON daily_briefings(stan_id, date);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_daily_briefings_updated_at
    BEFORE UPDATE ON daily_briefings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;

-- Users can read briefings for their stans
CREATE POLICY "Users can read their stan briefings" ON daily_briefings
FOR SELECT USING (
  stan_id IN (
    SELECT id FROM stans WHERE user_id = auth.uid()
  )
);

-- Service role can insert/update briefings
CREATE POLICY "Service can manage briefings" ON daily_briefings
FOR ALL USING (auth.role() = 'service_role');