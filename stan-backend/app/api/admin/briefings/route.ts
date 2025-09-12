import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: Fetch all today's briefings (admin view)
export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get all briefings for today with stan details
    const { data: briefings, error } = await supabase
      .from('daily_briefings')
      .select(`
        *,
        stans (
          id,
          name,
          description,
          categories (
            name,
            icon,
            color
          )
        )
      `)
      .eq('date', today)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`📊 Found ${briefings?.length || 0} briefings for ${today}`);

    return NextResponse.json({ 
      briefings: briefings || [],
      date: today,
      count: briefings?.length || 0
    });
  } catch (error) {
    console.error('Error fetching admin briefings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch briefings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}