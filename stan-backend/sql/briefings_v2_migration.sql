-- Consolidated briefings schema v2
-- Merges daily_briefings and public_briefings into single table
-- Adds cost tracking and improved indexing

-- Create new consolidated briefings table
CREATE TABLE IF NOT EXISTS briefings_v2 (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Stan information
  stan_name TEXT NOT NULL,
  stan_category TEXT NOT NULL,
  date DATE NOT NULL,

  -- Content
  topics JSONB NOT NULL,
  sources TEXT[] DEFAULT '{}',
  summary TEXT,
  content JSONB,  -- Full briefing content for backward compatibility
  images JSONB DEFAULT '[]',

  -- Optimization flags
  is_popular BOOLEAN DEFAULT false,  -- Batch-generated popular stan?
  is_cached BOOLEAN DEFAULT true,    -- Available for reuse?

  -- Cost tracking
  generation_cost_usd DECIMAL(10,4) DEFAULT 0.0,
  agent_type TEXT DEFAULT 'efficient_agent',  -- efficient_agent or orchestrator

  -- Timestamps
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',

  -- One briefing per stan per day
  UNIQUE(stan_name, date)
);

-- Create indexes for performance
CREATE INDEX idx_briefings_v2_date ON briefings_v2(date DESC);
CREATE INDEX idx_briefings_v2_popular ON briefings_v2(is_popular, date DESC) WHERE is_popular = true;
CREATE INDEX idx_briefings_v2_stan_date ON briefings_v2(stan_name, date DESC);
CREATE INDEX idx_briefings_v2_expires ON briefings_v2(expires_at) WHERE is_cached = true;
CREATE INDEX idx_briefings_v2_cost ON briefings_v2(generated_at, generation_cost_usd);

-- User subscriptions (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_stans_v2 (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stan_name TEXT NOT NULL,

  -- User preferences
  notification_enabled BOOLEAN DEFAULT true,
  notification_time TIME DEFAULT '09:00:00',  -- 9am default

  -- Tracking
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  total_reads INTEGER DEFAULT 0,

  PRIMARY KEY (user_id, stan_name)
);

-- Indexes for user_stans
CREATE INDEX idx_user_stans_v2_user ON user_stans_v2(user_id);
CREATE INDEX idx_user_stans_v2_unread ON user_stans_v2(user_id, last_read_at) WHERE last_read_at IS NULL;
CREATE INDEX idx_user_stans_v2_notifications ON user_stans_v2(notification_enabled, notification_time) WHERE notification_enabled = true;

-- RLS policies for briefings_v2
ALTER TABLE briefings_v2 ENABLE ROW LEVEL SECURITY;

-- Anyone can read briefings (they're all public or cached)
CREATE POLICY "Anyone can read briefings" ON briefings_v2
FOR SELECT USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service can manage briefings" ON briefings_v2
FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for user_stans_v2
ALTER TABLE user_stans_v2 ENABLE ROW LEVEL SECURITY;

-- Users can read their own stans
CREATE POLICY "Users can read own stans" ON user_stans_v2
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own stans
CREATE POLICY "Users can add own stans" ON user_stans_v2
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own stans
CREATE POLICY "Users can update own stans" ON user_stans_v2
FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own stans
CREATE POLICY "Users can delete own stans" ON user_stans_v2
FOR DELETE USING (auth.uid() = user_id);

-- Migration helper function: Copy data from old tables (run manually if needed)
-- This is commented out by default. Uncomment and run if migrating existing data.

/*
-- Migrate from daily_briefings
INSERT INTO briefings_v2 (stan_name, stan_category, date, topics, sources, summary, content, images, is_popular, generated_at)
SELECT
  s.name as stan_name,
  COALESCE(s.categories->>'primary', 'general') as stan_category,
  db.date,
  db.topics,
  db.search_sources as sources,
  '' as summary,  -- Will need to regenerate
  db.content,
  db.images,
  false as is_popular,
  db.created_at as generated_at
FROM daily_briefings db
JOIN stans s ON db.stan_id = s.id
ON CONFLICT (stan_name, date) DO NOTHING;

-- Migrate from public_briefings
INSERT INTO briefings_v2 (stan_name, stan_category, date, topics, sources, summary, is_popular, generated_at)
SELECT
  pb.stan_name,
  pb.stan_category,
  pb.date,
  pb.topics,
  pb.search_sources as sources,
  '' as summary,  -- Will need to regenerate
  true as is_popular,
  pb.created_at as generated_at
FROM public_briefings pb
ON CONFLICT (stan_name, date) DO NOTHING;

-- Migrate user subscriptions from stans table
INSERT INTO user_stans_v2 (user_id, stan_name, added_at)
SELECT
  user_id,
  name as stan_name,
  created_at as added_at
FROM stans
ON CONFLICT (user_id, stan_name) DO NOTHING;
*/

-- Views for backward compatibility (optional)
CREATE OR REPLACE VIEW daily_briefings_compat AS
SELECT
  b.id,
  NULL::UUID as stan_id,  -- No longer using stan_id
  b.date,
  b.content,
  b.topics,
  b.sources as search_sources,
  b.images,
  b.generated_at as created_at,
  b.generated_at as updated_at
FROM briefings_v2 b
WHERE b.is_popular = false;

CREATE OR REPLACE VIEW public_briefings_compat AS
SELECT
  b.stan_name || '_' || b.date::text as id,  -- Generate text ID
  b.stan_name,
  b.stan_category,
  b.date,
  b.topics,
  b.sources as search_sources,
  b.images,
  b.content as stan_data,
  b.generated_at as created_at
FROM briefings_v2 b
WHERE b.is_popular = true;

-- Function to clean up expired cached briefings (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_briefings()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM briefings_v2
  WHERE expires_at < NOW()
  AND is_cached = true;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update last_read tracking
CREATE OR REPLACE FUNCTION update_briefing_read(p_user_id UUID, p_stan_name TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE user_stans_v2
  SET
    last_read_at = NOW(),
    total_reads = total_reads + 1
  WHERE user_id = p_user_id
  AND stan_name = p_stan_name;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE briefings_v2 IS 'Consolidated briefings table - replaces daily_briefings and public_briefings';
COMMENT ON COLUMN briefings_v2.is_popular IS 'True if batch-generated for popular stan, false if custom user request';
COMMENT ON COLUMN briefings_v2.generation_cost_usd IS 'Estimated API cost in USD for generating this briefing';
COMMENT ON COLUMN briefings_v2.agent_type IS 'Which agent generated this: efficient_agent (cheap) or orchestrator (expensive)';
COMMENT ON TABLE user_stans_v2 IS 'User subscriptions to stans - many-to-many relationship';
