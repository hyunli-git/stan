-- Create the daily_briefings table
CREATE TABLE IF NOT EXISTS public.daily_briefings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stan_id uuid REFERENCES public.stans(id) ON DELETE CASCADE,
  date date NOT NULL,
  content text,
  topics jsonb DEFAULT '[]'::jsonb,
  search_sources text[] DEFAULT '{}',
  images jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(stan_id, date)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_briefings_date ON public.daily_briefings(date);
CREATE INDEX IF NOT EXISTS idx_daily_briefings_stan_date ON public.daily_briefings(stan_id, date);

-- Enable RLS
ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access" ON public.daily_briefings;
DROP POLICY IF EXISTS "Service role full access" ON public.daily_briefings;

-- Create RLS policies for public read access
CREATE POLICY "Public read access" ON public.daily_briefings
  FOR SELECT USING (true);

-- Create policy for service role full access  
CREATE POLICY "Service role full access" ON public.daily_briefings
  FOR ALL USING (auth.role() = 'service_role');

-- Insert some sample briefings for today
INSERT INTO public.daily_briefings (stan_id, date, content, topics, search_sources, images)
SELECT 
  s.id,
  CURRENT_DATE,
  '{"topics":[{"title":"Breaking News","content":"Amazing updates today!","sources":[]}],"searchSources":[],"images":[]}',
  '[{"title":"🔥 Breaking News","content":"' || s.name || ' is trending today with major updates! Fans are going crazy over the latest announcements. Don''t miss out on the excitement! 🎉✨","sources":["https://twitter.com/' || s.name || '","https://instagram.com/' || s.name || '"]},' || 
   '{"title":"📱 Social Buzz","content":"The ' || s.name || ' community is more active than ever! New content, fan art, and discussions are taking over social media. Join the conversation! 💬🌟","sources":["https://reddit.com/r/' || s.name || '","https://tiktok.com/@' || s.name || '"]},' ||
   '{"title":"🎯 What''s Next","content":"Exciting things are coming for ' || s.name || '! Rumors suggest big announcements are on the horizon. Keep your eyes peeled for updates! 👀🚀","sources":["https://youtube.com/' || s.name || '","https://news.google.com/search?q=' || s.name || '"]}]',
  ARRAY['https://twitter.com/' || s.name, 'https://instagram.com/' || s.name],
  '[]'::jsonb
FROM public.stans s
WHERE s.is_active = true
ON CONFLICT (stan_id, date) DO NOTHING;