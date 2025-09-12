import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('📰 Creating sample briefings for date:', today);

    // Get existing stans from database
    const { data: stans, error: stansError } = await supabase
      .from('stans')
      .select('*')
      .eq('is_active', true);

    if (stansError) {
      console.error('❌ Failed to get stans:', stansError);
      return NextResponse.json({ 
        error: 'Failed to get stans', 
        details: stansError 
      }, { status: 500 });
    }

    console.log(`📋 Found ${stans?.length || 0} stans to create briefings for`);

    if (!stans || stans.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No stans found - create some stans first',
        briefingsCreated: 0 
      });
    }

    const briefingsCreated = [];

    // Create briefings for each stan
    for (const stan of stans) {
      try {
        const briefingContent = {
          topics: [
            {
              title: "🔥 Breaking News",
              content: `${stan.name} is trending today with major updates! Fans are going crazy over the latest announcements. Don't miss out on the excitement! 🎉✨`,
              sources: [`https://twitter.com/${stan.name}`, `https://instagram.com/${stan.name}`]
            },
            {
              title: "📱 Social Media Buzz",
              content: `The ${stan.name} community is more active than ever! New content, fan art, and discussions are taking over social media. Join the conversation! 💬🌟`,
              sources: [`https://reddit.com/r/${stan.name}`, `https://tiktok.com/@${stan.name}`]
            },
            {
              title: "🎯 What's Coming Next",
              content: `Exciting things are coming for ${stan.name}! Rumors suggest big announcements are on the horizon. Keep your eyes peeled for updates! 👀🚀`,
              sources: [`https://youtube.com/${stan.name}`, `https://news.google.com/search?q=${stan.name}`]
            }
          ],
          searchSources: [`https://twitter.com/${stan.name}`, `https://instagram.com/${stan.name}`],
          images: []
        };

        // Try to create the briefing
        const { data, error } = await supabase
          .from('daily_briefings')
          .upsert({
            stan_id: stan.id,
            date: today,
            content: JSON.stringify(briefingContent),
            topics: briefingContent.topics,
            search_sources: briefingContent.searchSources,
            images: briefingContent.images
          })
          .select()
          .single();

        if (error) {
          console.error(`❌ Failed to create briefing for ${stan.name}:`, error);
          // If table doesn't exist, the error will show here
          if (error.message.includes('relation "public.daily_briefings" does not exist')) {
            return NextResponse.json({ 
              error: 'daily_briefings table does not exist - needs to be created in Supabase dashboard first',
              sqlToRun: `
                CREATE TABLE public.daily_briefings (
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
                
                ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;
                CREATE POLICY "Public read access" ON public.daily_briefings FOR SELECT USING (true);
              `,
              details: error
            }, { status: 500 });
          }
        } else {
          console.log(`✅ Created briefing for ${stan.name}`);
          briefingsCreated.push(stan.name);
        }

      } catch (err) {
        console.error(`❌ Error processing ${stan.name}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${briefingsCreated.length} briefings for today`,
      briefingsCreated,
      date: today,
      totalStans: stans.length
    });

  } catch (error) {
    console.error('❌ Error creating briefings:', error);
    return NextResponse.json({
      error: 'Failed to create briefings',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}