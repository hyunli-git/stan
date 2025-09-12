import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Simple endpoint to refresh briefings - minimal complexity
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

export async function GET() {
  return NextResponse.json({
    message: 'Simple refresh endpoint is live',
    timestamp: new Date().toISOString()
  });
}

export async function POST() {
  try {
    // Step 1: Clear existing briefings
    const { error: deleteError } = await supabase
      .from('briefings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return NextResponse.json({
        error: 'Failed to clear briefings',
        details: deleteError.message
      }, { status: 500 });
    }

    // Step 2: Call the generate-real-briefings endpoint
    const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://stan-peach.vercel.app'}/api/generate-real-briefings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const generateResult = await generateResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Briefings refreshed successfully',
      cleared: 'Old briefings cleared',
      generated: generateResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json({
      error: 'Refresh failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}