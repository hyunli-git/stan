-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users profile table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories for different types of stans
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO public.categories (name, icon, color) VALUES
  ('K-Pop', '🎵', '#FF6B6B'),
  ('Sports', '⚽', '#4ECDC4'),
  ('Gaming', '🎮', '#845EC2'),
  ('Anime', '🌸', '#FF9671'),
  ('Movies & TV', '🎬', '#F9F871'),
  ('Tech', '💻', '#00D2FC'),
  ('Fashion', '👗', '#FFC75F'),
  ('Music', '🎸', '#C34A36')
ON CONFLICT (name) DO NOTHING;

-- User's stans (things they follow)
CREATE TABLE IF NOT EXISTS public.stans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  priority INTEGER DEFAULT 1, -- 1-5, higher = more important
  platforms JSONB DEFAULT '{}', -- stores social media handles
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Daily briefings
CREATE TABLE IF NOT EXISTS public.briefings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stan_id UUID NOT NULL REFERENCES public.stans(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  summary TEXT,
  sources JSONB DEFAULT '[]', -- stores source URLs and platforms
  ai_generated BOOLEAN DEFAULT true,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false,
  UNIQUE(stan_id, date)
);

-- User preferences
CREATE TABLE IF NOT EXISTS public.preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  briefing_time TIME DEFAULT '09:00:00',
  timezone TEXT DEFAULT 'UTC',
  notification_enabled BOOLEAN DEFAULT true,
  email_digest BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Saved/favorite briefings
CREATE TABLE IF NOT EXISTS public.saved_briefings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  briefing_id UUID NOT NULL REFERENCES public.briefings(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(user_id, briefing_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_briefings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can read all profiles but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Categories: Everyone can read
CREATE POLICY "Categories are viewable by everyone" ON public.categories
  FOR SELECT USING (true);

-- Stans: Users can only manage their own stans
CREATE POLICY "Users can view their own stans" ON public.stans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stans" ON public.stans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stans" ON public.stans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stans" ON public.stans
  FOR DELETE USING (auth.uid() = user_id);

-- Briefings: Users can only see their own briefings
CREATE POLICY "Users can view their own briefings" ON public.briefings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own briefings" ON public.briefings
  FOR UPDATE USING (auth.uid() = user_id);

-- Preferences: Users can only manage their own preferences
CREATE POLICY "Users can view their own preferences" ON public.preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON public.preferences
  FOR ALL USING (auth.uid() = user_id);

-- Saved briefings: Users can only manage their own saved items
CREATE POLICY "Users can manage their own saved briefings" ON public.saved_briefings
  FOR ALL USING (auth.uid() = user_id);

-- Functions

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'display_name'
  );
  
  -- Create default preferences
  INSERT INTO public.preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_stans_updated_at
  BEFORE UPDATE ON public.stans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_preferences_updated_at
  BEFORE UPDATE ON public.preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();