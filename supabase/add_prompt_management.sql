-- Add custom prompts table for personalized briefing generation
CREATE TABLE IF NOT EXISTS public.stan_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stan_id UUID NOT NULL REFERENCES public.stans(id) ON DELETE CASCADE,
  custom_prompt TEXT,
  focus_areas JSONB DEFAULT '[]', -- Array of specific topics/areas to focus on
  tone TEXT DEFAULT 'informative', -- informative, casual, formal, enthusiastic
  length TEXT DEFAULT 'medium', -- short, medium, long
  include_sources BOOLEAN DEFAULT true,
  include_social_media BOOLEAN DEFAULT true,
  include_fan_reactions BOOLEAN DEFAULT true,
  include_upcoming_events BOOLEAN DEFAULT true,
  exclude_topics JSONB DEFAULT '[]', -- Array of topics to exclude
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, stan_id)
);

-- Add RLS for stan_prompts
ALTER TABLE public.stan_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policy for stan_prompts
CREATE POLICY "Users can manage their own stan prompts" ON public.stan_prompts
  FOR ALL USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER set_stan_prompts_updated_at
  BEFORE UPDATE ON public.stan_prompts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add default prompt templates
CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES public.categories(id),
  name TEXT NOT NULL,
  description TEXT,
  template TEXT NOT NULL,
  variables JSONB DEFAULT '[]', -- Variables that can be customized
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default prompt templates
INSERT INTO public.prompt_templates (category_id, name, description, template, variables, is_default) VALUES
  ((SELECT id FROM public.categories WHERE name = 'Music'), 'Music Artist Briefing', 'Comprehensive briefing for music artists', 
   'Today is {date}. Please search the web for the latest information and news about "{stan_name}" and create an English briefing.
   
   Focus Areas: {focus_areas}
   Category: {category}
   
   Please write in the following format:
   1. Recent music releases and performances (latest information as of today''s date)
   2. Chart performance and streaming data
   3. Fan and industry reactions
   4. Upcoming tour dates, album releases, or collaborations
   5. Social media highlights and interactions
   
   Tone: {tone}
   Include sources: {include_sources}', 
   '["stan_name", "date", "category", "focus_areas", "tone", "include_sources"]', true),
   
  ((SELECT id FROM public.categories WHERE name = 'K-Pop'), 'K-Pop Group Briefing', 'Specialized briefing for K-Pop groups', 
   'Today is {date}. Please search the web for the latest information and news about "{stan_name}" and create an English briefing.
   
   Focus Areas: {focus_areas}
   Category: {category}
   
   Please write in the following format:
   1. Recent comebacks, releases, or performances
   2. Member individual activities and achievements
   3. Global chart performance and achievements
   4. Fan projects and community reactions
   5. Upcoming schedules, concerts, or variety show appearances
   
   Tone: {tone}
   Include sources: {include_sources}', 
   '["stan_name", "date", "category", "focus_areas", "tone", "include_sources"]', true),
   
  ((SELECT id FROM public.categories WHERE name = 'Sports'), 'Sports Team/Player Briefing', 'Comprehensive sports briefing', 
   'Today is {date}. Please search the web for the latest information and news about "{stan_name}" and create an English briefing.
   
   Focus Areas: {focus_areas}
   Category: {category}
   
   Please write in the following format:
   1. Recent games, matches, or competitions
   2. Performance statistics and rankings
   3. Team news, transfers, or player updates
   4. Fan reactions and media coverage
   5. Upcoming fixtures and important dates
   
   Tone: {tone}
   Include sources: {include_sources}', 
   '["stan_name", "date", "category", "focus_areas", "tone", "include_sources"]', true);

-- Enable RLS for prompt_templates (read-only for all users)
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prompt templates are viewable by everyone" ON public.prompt_templates
  FOR SELECT USING (true);