import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// GET: Fetch all today's briefings (admin view)
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    // Try to get briefings from 'briefings' table first
    let { data: briefings, error } = await supabase
      .from('briefings')
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
      .order('created_at', { ascending: false });
    
    // If no briefings found, try 'daily_briefings' table
    if (!briefings || briefings.length === 0) {
      const dailyResult = await supabase
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
      
      if (dailyResult.data) {
        briefings = dailyResult.data;
        error = dailyResult.error;
      }
    }

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