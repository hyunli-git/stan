import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize with service role to bypass RLS for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    console.log('🧹 Starting clear and refresh operation...');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Step 1: Delete all existing briefings for today
    console.log('🗑️ Clearing existing briefings for', today);
    const { error: deleteError } = await supabase
      .from('briefings')
      .delete()
      .eq('date', today);

    if (deleteError) {
      console.error('❌ Error deleting old briefings:', deleteError);
      throw deleteError;
    }

    console.log('✅ Successfully cleared old briefings');

    // Step 2: Trigger regeneration by calling the generate-real-briefings endpoint
    console.log('🔄 Triggering fresh briefing generation...');
    
    // Call the generate-real-briefings endpoint internally
    const generateUrl = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://stan-peach.vercel.app'}/api/generate-real-briefings`;
    
    console.log('📞 Calling generation endpoint:', generateUrl);
    
    // Start the generation process but don't wait for it to complete (it might timeout)
    fetch(generateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }).catch((error) => {
      console.log('⚠️ Generation process started (may continue in background):', error.message);
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully cleared old briefings and triggered fresh generation',
      timestamp: new Date().toISOString(),
      date: today,
      status: 'Briefings cleared and regeneration started'
    });

  } catch (error) {
    console.error('❌ Error in clear-and-refresh:', error);
    return NextResponse.json(
      { 
        error: 'Clear and refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}