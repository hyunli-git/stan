import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

interface StanPrompt {
  id?: string;
  user_id: string;
  stan_id: string;
  custom_prompt?: string;
  focus_areas?: string[];
  tone?: string;
  length?: string;
  include_sources?: boolean;
  include_social_media?: boolean;
  include_fan_reactions?: boolean;
  include_upcoming_events?: boolean;
  exclude_topics?: string[];
}

// GET - Fetch custom prompt for a stan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const stanId = searchParams.get('stan_id');

    if (!userId || !stanId) {
      return NextResponse.json({ error: 'user_id and stan_id are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('stan_prompts')
      .select('*')
      .eq('user_id', userId)
      .eq('stan_id', stanId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('Error fetching prompt:', error);
      return NextResponse.json({ error: 'Failed to fetch prompt' }, { status: 500 });
    }

    return NextResponse.json({ prompt: data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create or update custom prompt for a stan
export async function POST(request: NextRequest) {
  try {
    const promptData: StanPrompt = await request.json();

    if (!promptData.user_id || !promptData.stan_id) {
      return NextResponse.json({ error: 'user_id and stan_id are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('stan_prompts')
      .upsert({
        user_id: promptData.user_id,
        stan_id: promptData.stan_id,
        custom_prompt: promptData.custom_prompt,
        focus_areas: promptData.focus_areas || [],
        tone: promptData.tone || 'informative',
        length: promptData.length || 'medium',
        include_sources: promptData.include_sources ?? true,
        include_social_media: promptData.include_social_media ?? true,
        include_fan_reactions: promptData.include_fan_reactions ?? true,
        include_upcoming_events: promptData.include_upcoming_events ?? true,
        exclude_topics: promptData.exclude_topics || []
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving prompt:', error);
      return NextResponse.json({ error: 'Failed to save prompt' }, { status: 500 });
    }

    return NextResponse.json({ prompt: data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove custom prompt for a stan (revert to default)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const stanId = searchParams.get('stan_id');

    if (!userId || !stanId) {
      return NextResponse.json({ error: 'user_id and stan_id are required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('stan_prompts')
      .delete()
      .eq('user_id', userId)
      .eq('stan_id', stanId);

    if (error) {
      console.error('Error deleting prompt:', error);
      return NextResponse.json({ error: 'Failed to delete prompt' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}