import { NextRequest, NextResponse } from 'next/server';

// This endpoint triggers the daily briefing generation
// It can be called by Vercel cron jobs or manually for testing
export async function POST(request: NextRequest) {
  try {
    const startTime = new Date();
    console.log(`🚀 Daily briefing cron job started at ${startTime.toISOString()}`);

    // For Vercel cron jobs, verify the cron-secret header
    const cronSecret = request.headers.get('x-vercel-cron-secret');
    const authHeader = request.headers.get('authorization');
    
    // Check both Vercel cron secret and manual authorization
    const isVercelCron = cronSecret && cronSecret === process.env.CRON_SECRET;
    const isManualAuth = authHeader && authHeader === `Bearer ${process.env.CRON_SECRET}`;
    
    if (!isVercelCron && !isManualAuth) {
      console.log('❌ Unauthorized cron job attempt');
      return NextResponse.json({ 
        error: 'Unauthorized',
        timestamp: startTime.toISOString() 
      }, { status: 401 });
    }

    console.log('✅ Cron job authenticated successfully');

    // Call the daily-briefings endpoint to generate briefings
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    console.log(`📡 Calling briefing generation API at ${baseUrl}`);
    
    const response = await fetch(`${baseUrl}/api/daily-briefings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ force: false })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to generate briefings');
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    console.log(`✅ Daily briefing cron job completed in ${duration}ms`);
    console.log(`📊 Results:`, data);

    return NextResponse.json({
      success: true,
      message: 'Daily briefings generated successfully',
      timestamp: endTime.toISOString(),
      duration: `${duration}ms`,
      ...data
    });

  } catch (error) {
    const errorTime = new Date();
    console.error('❌ Error in daily briefing cron job:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate daily briefings',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: errorTime.toISOString()
      },
      { status: 500 }
    );
  }
}

// Allow GET for testing/manual trigger
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get('secret');
    
    if (secret !== (process.env.CRON_SECRET || 'default-secret')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call POST method
    return POST(request);
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to generate daily briefings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}