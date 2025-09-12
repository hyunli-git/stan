import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint helps us check what briefings are currently in the database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get current briefings with their stan info
    const { data: briefings, error } = await supabase
      .from('briefings')
      .select(`
        id,
        created_at,
        date,
        ai_generated,
        topics,
        search_sources,
        stans (
          id,
          name,
          categories (
            name,
            icon,
            color
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }

    const briefingSummary = briefings?.map(b => ({
      id: b.id,
      stan_name: b.stans && typeof b.stans === 'object' && 'name' in b.stans ? (b.stans as { name: string }).name : 'Unknown Stan',
      date: b.date,
      created_at: b.created_at,
      topics_count: b.topics?.length || 0,
      first_topic_title: b.topics?.[0]?.title || 'No topics',
      first_topic_preview: (b.topics?.[0]?.content?.substring(0, 100) || 'No content') + '...',
      has_sources: (b.search_sources?.length || 0) > 0,
      ai_generated: b.ai_generated
    })) || [];

    return NextResponse.json({
      success: true,
      total_briefings: briefings?.length || 0,
      briefings: briefingSummary
    });

  } catch (error) {
    console.error('Error checking briefings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check briefings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Simple database test - just count briefings
    const { count, error } = await supabase
      .from('briefings')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      total_briefings_in_db: count,
      message: 'Database connection test successful'
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}