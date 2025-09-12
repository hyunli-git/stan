import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get all stans in database
    const { data: allStans, error: stansError } = await supabase
      .from('stans')
      .select('id, name, user_id, is_active')
      .limit(10);

    // Get all categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .limit(10);

    // Check what briefing tables exist
    const { data: briefings, error: briefError } = await supabase
      .from('briefings')
      .select('*')
      .limit(5);

    const { data: savedBriefings, error: savedError } = await supabase
      .from('saved_briefings')
      .select('*')
      .limit(5);

    const { data: dailyBriefings, error: dailyError } = await supabase
      .from('daily_briefings')
      .select('*')
      .limit(5);

    // Get sample user stans (any user)
    const { data: userStans, error: userError } = await supabase
      .from('stans')
      .select('*')
      .neq('user_id', '00000000-0000-0000-0000-000000000000')
      .limit(5);

    return NextResponse.json({
      success: true,
      today,
      data: {
        totalStans: allStans?.length || 0,
        stans: allStans || [],
        categories: categories || [],
        briefings: briefings || [],
        savedBriefings: savedBriefings || [],
        dailyBriefings: dailyBriefings || [],
        userStans: userStans || []
      },
      errors: {
        stansError: stansError?.message,
        catError: catError?.message,
        briefError: briefError?.message,
        savedError: savedError?.message,
        dailyError: dailyError?.message,
        userError: userError?.message
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}