import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Test if environment variables are loaded
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!hasSupabaseUrl || !hasServiceKey) {
      return NextResponse.json({
        error: 'Missing environment variables',
        hasSupabaseUrl,
        hasServiceKey
      }, { status: 500 });
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
    );

    // Test database connection by counting stans
    const { count: stansCount, error: stansError } = await supabase
      .from('stans')
      .select('*', { count: 'exact', head: true });

    if (stansError) {
      return NextResponse.json({
        error: 'Database query failed',
        details: stansError.message,
        hasSupabaseUrl,
        hasServiceKey
      }, { status: 500 });
    }

    // Count daily briefings
    const { count: briefingsCount, error: briefingsError } = await supabase
      .from('daily_briefings')
      .select('*', { count: 'exact', head: true });

    if (briefingsError) {
      return NextResponse.json({
        error: 'Briefings query failed',
        details: briefingsError.message,
        stansCount
      }, { status: 500 });
    }

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Count today's briefings
    const { count: todaysBriefings, error: todayError } = await supabase
      .from('daily_briefings')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);

    return NextResponse.json({
      success: true,
      database: 'Connected',
      stansCount: stansCount || 0,
      totalBriefings: briefingsCount || 0,
      todaysBriefings: todaysBriefings || 0,
      today,
      environment: {
        hasSupabaseUrl,
        hasServiceKey
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}