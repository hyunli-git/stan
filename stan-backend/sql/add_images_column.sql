-- Add images column to daily_briefings table
ALTER TABLE daily_briefings 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';

COMMENT ON COLUMN daily_briefings.images IS 'Array of image objects [{url, alt, source, thumbnail}]';