import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

export async function POST() {
  try {
    console.log('🔨 Creating daily_briefings table...');
    
    // Create the daily_briefings table
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.daily_briefings (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          stan_id uuid REFERENCES public.stans(id) ON DELETE CASCADE,
          date date NOT NULL,
          content text,
          topics jsonb DEFAULT '[]'::jsonb,
          search_sources text[] DEFAULT '{}',
          images jsonb DEFAULT '[]'::jsonb,
          created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
          UNIQUE(stan_id, date)
        );
        
        -- Create index for faster queries
        CREATE INDEX IF NOT EXISTS idx_daily_briefings_date ON public.daily_briefings(date);
        CREATE INDEX IF NOT EXISTS idx_daily_briefings_stan_date ON public.daily_briefings(stan_id, date);
        
        -- Enable RLS
        ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies
        DROP POLICY IF EXISTS "Public read access" ON public.daily_briefings;
        CREATE POLICY "Public read access" ON public.daily_briefings
          FOR SELECT USING (true);
          
        DROP POLICY IF EXISTS "Service role full access" ON public.daily_briefings;
        CREATE POLICY "Service role full access" ON public.daily_briefings
          FOR ALL USING (auth.role() = 'service_role');
      `
    });

    if (tableError) {
      console.error('❌ Failed to create table:', tableError);
      return NextResponse.json({ 
        error: 'Failed to create table', 
        details: tableError 
      }, { status: 500 });
    }

    console.log('✅ daily_briefings table created successfully');

    // Now seed with some sample data
    const today = new Date().toISOString().split('T')[0];
    
    // Get some stans to create briefings for
    const { data: stans, error: stansError } = await supabase
      .from('stans')
      .select('id, name')
      .limit(5);

    if (stansError) {
      console.error('❌ Failed to get stans:', stansError);
      return NextResponse.json({ 
        success: true,
        message: 'Table created but no stans found to seed',
        tableCreated: true 
      });
    }

    const briefingsToInsert = [];

    for (const stan of stans || []) {
      const briefingContent = {
        topics: [
          {
            title: "🔥 Breaking News",
            content: `${stan.name} is trending today with major updates! Fans are going crazy over the latest announcements. Don't miss out on the excitement! 🎉✨`,
            sources: [`https://twitter.com/${stan.name}`, `https://instagram.com/${stan.name}`]
          },
          {
            title: "📱 Social Buzz",
            content: `The ${stan.name} community is more active than ever! New content, fan art, and discussions are taking over social media. Join the conversation! 💬🌟`,
            sources: [`https://reddit.com/r/${stan.name}`, `https://tiktok.com/@${stan.name}`]
          },
          {
            title: "🎯 What's Next",
            content: `Exciting things are coming for ${stan.name}! Rumors suggest big announcements are on the horizon. Keep your eyes peeled for updates! 👀🚀`,
            sources: [`https://youtube.com/${stan.name}`, `https://news.google.com/search?q=${stan.name}`]
          }
        ],
        searchSources: [`https://twitter.com/${stan.name}`, `https://instagram.com/${stan.name}`],
        images: []
      };

      briefingsToInsert.push({
        stan_id: stan.id,
        date: today,
        content: JSON.stringify(briefingContent),
        topics: briefingContent.topics,
        search_sources: briefingContent.searchSources,
        images: briefingContent.images,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    if (briefingsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('daily_briefings')
        .insert(briefingsToInsert);

      if (insertError) {
        console.error('❌ Failed to insert briefings:', insertError);
        return NextResponse.json({ 
          success: true,
          message: 'Table created but failed to seed data',
          tableCreated: true,
          seedError: insertError 
        });
      }

      console.log(`✅ Seeded ${briefingsToInsert.length} briefings`);
    }

    return NextResponse.json({
      success: true,
      message: `Table created and seeded with ${briefingsToInsert.length} briefings`,
      tableCreated: true,
      briefingsCreated: briefingsToInsert.length,
      date: today
    });

  } catch (error) {
    console.error('❌ Error creating table:', error);
    return NextResponse.json({
      error: 'Failed to create table',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}