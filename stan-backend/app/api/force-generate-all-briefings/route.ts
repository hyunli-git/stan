import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize with service role to bypass RLS for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

// Generate realistic briefing content without external API
const generateMockBriefing = (stanName: string, category: string) => {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // Category-specific content templates
  interface Topic {
    title: string;
    content: string;
    sources: string[];
  }
  
  interface ContentTemplate {
    topics: Topic[];
  }
  
  const contentTemplates: Record<string, ContentTemplate> = {
    'K-Pop': {
      topics: [
        {
          title: "🎵 Latest Music & Performances",
          content: `${stanName} just dropped a surprise performance video that's trending worldwide! The choreography showcases their signature style with a fresh twist. Fans are already creating dance covers across social media platforms! 🔥💃`,
          sources: [`https://youtube.com/watch?v=example`, `https://twitter.com/${stanName}/status/example`]
        },
        {
          title: "📱 Social Media Buzz", 
          content: `${stanName} broke the internet today with their latest Instagram post, gaining over 2 million likes in just 3 hours! The hashtag #${stanName}${today.split(' ')[0]} is trending globally with fans sharing their favorite moments! 💜✨`,
          sources: [`https://instagram.com/${stanName}`, `https://twitter.com/search?q=%23${stanName}`]
        },
        {
          title: "🎉 Upcoming Schedule",
          content: `Mark your calendars! ${stanName} announced a special live stream this weekend, plus hints about a new project coming next month. Industry insiders suggest a possible collaboration that fans have been dreaming about! 🚀📅`,
          sources: [`https://weverse.io/${stanName}`, `https://vlive.tv/${stanName}`]
        }
      ]
    },
    'Music': {
      topics: [
        {
          title: "🎸 New Music Alert",
          content: `${stanName} teased new music in the studio today! Producers hint at a genre-bending track that combines their classic sound with unexpected electronic elements. The single is rumored to drop before the end of the month! 🎵🔥`,
          sources: [`https://spotify.com/artist/${stanName}`, `https://apple.com/music/${stanName}`]
        },
        {
          title: "🏆 Chart Performance",
          content: `${stanName}'s latest release climbed 15 spots on the Billboard Hot 100 this week! Streaming numbers show a 40% increase, with fans organizing streaming parties worldwide. Radio play has doubled in major markets! 📈💪`,
          sources: [`https://billboard.com/artist/${stanName}`, `https://chartdata.com/${stanName}`]
        }
      ]
    },
    'Gaming': {
      topics: [
        {
          title: "🎮 Latest Updates",
          content: `${stanName} just released a massive update with new features players have been requesting! The patch includes balance changes, new cosmetics, and a surprise game mode. Servers are packed with returning players! 🚀🔥`,
          sources: [`https://twitch.tv/directory/game/${stanName}`, `https://reddit.com/r/${stanName}`]
        },
        {
          title: "🏆 Esports Scene",
          content: `The ${stanName} championship tournament announced a record-breaking prize pool! Top teams from around the world are preparing, with qualifiers starting next week. Viewership is expected to hit new heights! 💰🌍`,
          sources: [`https://esports.com/${stanName}`, `https://liquipedia.net/${stanName}`]
        }
      ]
    },
    'Movies & TV': {
      topics: [
        {
          title: "🎬 Production News",
          content: `${stanName} filming update: Behind-the-scenes footage leaked showing incredible action sequences! Cast members shared cryptic hints about plot twists that have fans theorizing. The hype is real! 🎥🔥`,
          sources: [`https://variety.com/${stanName}`, `https://hollywoodreporter.com/${stanName}`]
        },
        {
          title: "📺 Streaming Updates",
          content: `${stanName} broke streaming records this week with 50 million hours watched! Critics are calling it the must-watch series of the year. Season renewal already confirmed due to overwhelming success! 📈🌟`,
          sources: [`https://netflix.com/${stanName}`, `https://deadline.com/${stanName}`]
        }
      ]
    },
    'Sports': {
      topics: [
        {
          title: "⚽ Game Highlights",
          content: `${stanName} delivered an outstanding performance in today's match! Key plays in the final quarter secured the victory, with stats showing their best performance of the season. The crowd went wild! 🏆⚡`,
          sources: [`https://espn.com/team/${stanName}`, `https://nba.com/${stanName}`]
        },
        {
          title: "📊 Team Updates",
          content: `Breaking: ${stanName} announced new roster changes that have fans excited! The coaching staff confirmed all players are healthy and ready for the upcoming crucial games. Team chemistry is at an all-time high! 💪🔥`,
          sources: [`https://sports.yahoo.com/${stanName}`, `https://theathetic.com/${stanName}`]
        }
      ]
    }
  };

  // Get category-specific content or use default
  const categoryKey = Object.keys(contentTemplates).find(key => 
    category.toLowerCase().includes(key.toLowerCase())
  ) || 'Music';

  const content = contentTemplates[categoryKey];
  
  return {
    topics: content.topics,
    searchSources: content.topics.flatMap(t => t.sources),
    images: [],
    generatedAt: new Date().toISOString()
  };
};

export async function POST() {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Generating briefings for all stans on date:', today);

    // Get ALL active stans
    const { data: stans, error: stansError } = await supabase
      .from('stans')
      .select(`
        id,
        name,
        description,
        user_id,
        categories (
          name,
          icon,
          color
        )
      `)
      .eq('is_active', true);

    if (stansError) throw stansError;

    if (!stans || stans.length === 0) {
      console.log(`⚠️ No active stans found`);
      return NextResponse.json({ 
        message: 'No active stans found',
        count: 0
      });
    }

    console.log(`🚀 Force generating briefings for ${stans.length} stans`);

    const briefingsGenerated = [];

    for (const stan of stans) {
      try {
        // Delete existing briefing if any
        await supabase
          .from('briefings')
          .delete()
          .eq('stan_id', stan.id);

        console.log(`📰 Generating briefing for: ${stan.name}`);
        
        const category = Array.isArray(stan.categories) ? stan.categories[0] : stan.categories;
        const briefingContent = generateMockBriefing(stan.name, category.name);
        
        const briefingData = {
          stan_id: stan.id,
          date: today,
          content: JSON.stringify(briefingContent),
          topics: briefingContent.topics,
          search_sources: briefingContent.searchSources || [],
          images: briefingContent.images || [],
          created_at: new Date().toISOString(),
        };

        const { data: insertData, error: insertError } = await supabase
          .from('briefings')
          .insert(briefingData)
          .select();

        if (insertError) {
          console.error(`❌ Failed to save briefing for ${stan.name}:`, insertError.message);
        } else if (insertData && insertData.length > 0) {
          console.log(`✅ Generated and saved briefing for: ${stan.name}`);
          briefingsGenerated.push(stan.name);
        }
        
      } catch (error) {
        console.error(`❌ Failed to generate briefing for ${stan.name}:`, error);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Generated ${briefingsGenerated.length} briefings for all stans`,
      stans: briefingsGenerated,
      totalStans: stans.length,
      date: today
    });

  } catch (error) {
    console.error('Error force generating briefings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate briefings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}