-- Artists table
CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily briefings table (pre-generated)
CREATE TABLE IF NOT EXISTS daily_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  summary TEXT,
  topics JSONB DEFAULT '[]',
  sources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(artist_id, date)
);

-- User follows table
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, artist_id)
);

-- Insert MVP artists
INSERT INTO artists (name, category) VALUES
  ('Tyler, the Creator', 'Music'),
  ('BLACKPINK', 'K-Pop')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_briefings_date ON daily_briefings(date);
CREATE INDEX IF NOT EXISTS idx_daily_briefings_artist_date ON daily_briefings(artist_id, date);
CREATE INDEX IF NOT EXISTS idx_user_follows_user ON user_follows(user_id);

-- Enable RLS
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Public read access for artists and briefings
CREATE POLICY "Artists are viewable by everyone" ON artists FOR SELECT USING (true);
CREATE POLICY "Briefings are viewable by everyone" ON daily_briefings FOR SELECT USING (true);

-- Users can manage their own follows
CREATE POLICY "Users can view their follows" ON user_follows FOR SELECT USING (true);
CREATE POLICY "Users can insert their follows" ON user_follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete their follows" ON user_follows FOR DELETE USING (true);
