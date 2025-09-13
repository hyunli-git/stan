import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize with service role to bypass RLS for server-side operations
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Verify service role key is configured
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not configured');
}

// Function to extract images from various sources
const extractImagesFromSources = async (sources: string[]): Promise<any[]> => {
  const images = [];
  
  for (const source of sources) {
    try {
      // YouTube video
      if (source.includes('youtube.com/watch') || source.includes('youtu.be/')) {
        const videoIdMatch = source.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        if (videoIdMatch) {
          const videoId = videoIdMatch[1];
          images.push({
            url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            alt: 'YouTube video',
            source: source,
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
          });
        }
      }
      // Twitter/X specific posts
      else if ((source.includes('twitter.com/') || source.includes('x.com/')) && source.includes('/status/')) {
        images.push({
          url: `https://via.placeholder.com/400x300/1DA1F2/ffffff?text=Twitter+Post`,
          alt: 'Twitter post',
          source: source,
          thumbnail: `https://via.placeholder.com/200x150/1DA1F2/ffffff?text=X`
        });
      }
      // Instagram specific posts
      else if (source.includes('instagram.com/p/') || source.includes('instagram.com/reel/')) {
        images.push({
          url: `https://via.placeholder.com/400x400/E4405F/ffffff?text=Instagram`,
          alt: 'Instagram post',
          source: source,
          thumbnail: `https://via.placeholder.com/200x200/E4405F/ffffff?text=IG`
        });
      }
      // TikTok specific videos
      else if (source.includes('tiktok.com/@') && source.includes('/video/')) {
        images.push({
          url: `https://via.placeholder.com/400x600/000000/ffffff?text=TikTok`,
          alt: 'TikTok video',
          source: source,
          thumbnail: `https://via.placeholder.com/200x300/000000/ffffff?text=TikTok`
        });
      }
    } catch (error) {
      console.error(`Error extracting image from ${source}:`, error);
    }
  }
  
  return images;
};

// Perplexity API generation function
const generateWithPerplexity = async (stanName: string, category: string) => {
  try {
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const prompt = `Today is ${today}. Search for the LATEST updates about "${stanName}" from the last 24-48 hours. Focus on what's happening RIGHT NOW - today's activities, viral moments, and fan reactions.

Find and include:
- What ${stanName} did TODAY or YESTERDAY specifically
- Viral fan content, edits, or memes trending right now
- Real-time social media reactions and trending hashtags
- Fan accounts reporting sightings, airport photos, or live updates
- Any content going viral on TikTok, Twitter/X, Instagram, or YouTube
- If no official updates, include popular fan theories, discussions, or creative content

Return as JSON with ACTUAL URLs to specific posts/videos (not just domain names):

{
  "topics": [
    {
      "title": "🔥 Breaking & Hot Right Now",
      "content": "URGENT updates from the last 24 hours - surprise releases, live appearances, viral moments, or trending topics. Be specific with times and details!",
      "sources": ["actual_news_url", "actual_video_url", "actual_social_post"]
    },
    {
      "title": "💬 Stan Twitter & Fan Reactions",
      "content": "What fans are going CRAZY about - viral edits, memes, trending hashtags, fan theories, or community discussions. Include usernames and view counts!",
      "sources": ["actual_tweet_url", "actual_tiktok_url", "actual_fan_account"]
    },
    {
      "title": "📸 Visual Content & Fashion Moments", 
      "content": "Recent photos, outfits, aesthetic content, or visual moments fans are obsessing over. Include fashion brands, styling details, or photo shoots!",
      "sources": ["actual_instagram_post", "actual_photoshoot", "actual_fashion_article"]
    },
    {
      "title": "🎵 Music, Performances & Studio Updates",
      "content": "New music, live performances, covers, studio sessions, collaborations, or music-related content. Include streaming numbers and chart positions!",
      "sources": ["actual_music_video", "actual_performance_clip", "actual_studio_update"]
    },
    {
      "title": "🎬 Video Content & Behind-the-Scenes",
      "content": "New videos, vlogs, behind-the-scenes content, interviews, or documentary footage. Include specific moments fans are talking about!",
      "sources": ["actual_youtube_video", "actual_interview", "actual_bts_content"]
    },
    {
      "title": "🏆 Records, Awards & Achievements",
      "content": "Chart achievements, award wins, certifications, milestone numbers, or record-breaking moments. Include specific statistics and rankings!",
      "sources": ["actual_chart_news", "actual_award_announcement", "actual_milestone_post"]
    },
    {
      "title": "✈️ Travel, Appearances & Sightings",
      "content": "Airport photos, public appearances, event sightings, or travel updates. Include locations, fan encounters, and specific details!",
      "sources": ["actual_airport_photo", "actual_event_coverage", "actual_sighting_post"]
    },
    {
      "title": "🤝 Collaborations & Industry News",
      "content": "New collaborations, brand partnerships, industry connections, or business updates. Include partner details and project information!",
      "sources": ["actual_collab_announcement", "actual_brand_partnership", "actual_industry_news"]
    },
    {
      "title": "💝 Personal Updates & Life Moments",
      "content": "Personal posts, life updates, family moments, or intimate shares from the artist. Include emotional fan reactions and personal details!",
      "sources": ["actual_personal_post", "actual_life_update", "actual_intimate_moment"]
    },
    {
      "title": "📅 Upcoming & Future Plans",
      "content": "Confirmed upcoming events, teased releases, tour dates, or future projects fans are anticipating. Include countdowns and preparation details!",
      "sources": ["actual_announcement", "actual_teaser", "actual_tour_date"]
    }
  ]
}

IMPORTANT: 
- Use casual, excited fan language ("OMG", "literally crying", "we won", etc.)
- Include specific times ("3 hours ago", "last night", "this morning")
- Mention viral view counts ("5M views in 2 hours")
- Reference fan inside jokes or memes if relevant
- Make it feel URGENT and CURRENT - not generic news`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.85,
        max_tokens: 1200
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Perplexity API error:', error);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse the response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Extract all sources
        const allSources = parsed.topics.flatMap((t: any) => t.sources || []);
        
        // Extract images from sources
        const images = await extractImagesFromSources(allSources);
        
        // Add images to each topic
        for (const topic of parsed.topics) {
          if (topic.sources && topic.sources.length > 0) {
            topic.images = await extractImagesFromSources(topic.sources);
          }
        }
        
        return {
          topics: parsed.topics,
          searchSources: allSources,
          images: images
        };
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
    }

    // Fallback - clean up content before showing
    let cleanContent = content;
    try {
      // If it looks like JSON, try to extract readable content
      if (content.trim().startsWith('{') && content.includes('content')) {
        const contentMatch = content.match(/"content":\s*"([^"]+)"/);
        if (contentMatch) {
          cleanContent = contentMatch[1].replace(/\\n/g, ' ').replace(/\\/g, '');
        }
      }
    } catch (e) {
      // If extraction fails, just clean up the raw content
      cleanContent = content.replace(/[{}"\[\]]/g, ' ')
        .replace(/content:|title:|sources:/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    return {
      topics: [{
        title: "📰 Latest Update",
        content: cleanContent,
        sources: []
      }],
      searchSources: [],
      images: []
    };

  } catch (error) {
    console.error('Perplexity generation error:', error);
    throw error;
  }
};

interface Stan {
  id: string;
  name: string;
  user_id: string;
  description?: string;
  categories: {
    name: string;
    icon: string;
    color: string;
  } | {
    name: string;
    icon: string;
    color: string;
  }[];
}

interface BriefingTopic {
  title: string;
  content: string;
  sources?: string[];
  images?: ImageData[];
}

interface ImageData {
  url: string;
  alt: string;
  source: string;
  thumbnail?: string;
}

interface BriefingContent {
  topics: BriefingTopic[];
  searchSources?: string[];
  images?: ImageData[];
}

// GET: Fetch today's briefings for a user
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Use consistent date formatting (UTC) to avoid timezone issues
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Looking for briefings on date:', today);

    // Get user's followed stan names (not IDs, because global stans are owned by system user)
    const supabase = getSupabaseClient();
    const { data: userStans, error: stansError } = await supabase
      .from('stans')
      .select('name')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (stansError) throw stansError;

    const followedStanNames = userStans?.map(stan => stan.name) || [];
    console.log('👤 User follows these stans:', followedStanNames);

    if (followedStanNames.length === 0) {
      // User has no followed stans - return empty array
      console.log('⚠️ No followed stans found for user:', userId);
      return NextResponse.json({ briefings: [], message: 'No followed stans found for user' });
    }

    // Try to get briefings from the 'briefings' table first (where seed-all-stans creates them)
    let { data: allBriefings, error } = await supabase
      .from('briefings')
      .select(`
        *,
        stans (
          id,
          name,
          description,
          user_id,
          categories (
            name,
            icon,
            color
          )
        )
      `)
      .order('created_at', { ascending: false });
    
    // If no briefings found in 'briefings' table, try 'daily_briefings' table
    if (!allBriefings || allBriefings.length === 0) {
      const dailyResult = await supabase
        .from('daily_briefings')
        .select(`
          *,
          stans (
            id,
            name,
            description,
            user_id,
            categories (
              name,
              icon,
              color
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (dailyResult.data) {
        allBriefings = dailyResult.data;
        error = dailyResult.error;
      }
    }
    
    // Filter to only show briefings for stans the user follows
    const briefings = allBriefings?.filter(briefing => 
      briefing.stans && followedStanNames.includes(briefing.stans.name)
    ) || [];

    if (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }

    console.log('📰 Found briefings:', briefings?.length || 0);
    if (briefings && briefings.length > 0) {
      console.log('📋 Briefing details:', briefings.map(b => ({
        id: b.id,
        stan_name: b.stans?.name,
        date: b.date,
        topics_count: b.topics?.length || 0
      })));
    }

    return NextResponse.json({ briefings: briefings || [] });
  } catch (error) {
    console.error('Error fetching daily briefings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch daily briefings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST: Generate daily briefings for all stans using Perplexity
export async function POST(request: NextRequest) {
  try {
    const { force = false } = await request.json();
    const today = new Date().toISOString().split('T')[0];
    const supabase = getSupabaseClient();

    // Check if briefings already exist for today (unless force is true)
    if (!force) {
      const { data: existingBriefings } = await supabase
        .from('daily_briefings')
        .select('id')
        .eq('date', today)
        .limit(1);

      if (existingBriefings && existingBriefings.length > 0) {
        return NextResponse.json({ 
          message: 'Daily briefings already generated for today',
          date: today 
        });
      }
    }

    // Check for Perplexity API key
    if (!process.env.PERPLEXITY_API_KEY) {
      return NextResponse.json({
        error: 'Perplexity API key not configured',
        message: 'Please add PERPLEXITY_API_KEY to environment variables',
        setup: 'Get your API key at: https://www.perplexity.ai/settings/api'
      }, { status: 500 });
    }

    // Get all active stans
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
      .eq('is_active', true)
      .limit(50); // Limit to prevent timeout

    if (stansError) throw stansError;

    if (!stans || stans.length === 0) {
      return NextResponse.json({ 
        message: 'No active stans found to generate briefings for',
        date: today 
      });
    }

    console.log(`🚀 Generating daily briefings with Perplexity for ${stans.length} stans`);

    const results = [];
    const errors = [];

    // Generate briefings for each stan using Perplexity
    for (const stan of stans) {
      try {
        console.log(`🔥 Generating LIVE briefing with Perplexity for: ${stan.name}`);
        
        // Handle categories - could be object or array
        const category = Array.isArray(stan.categories) ? stan.categories[0] : stan.categories;
        
        const briefingContent = await generateWithPerplexity(
          stan.name,
          category.name
        );

        // Save to daily_briefings table
        const { data: savedBriefing, error: saveError } = await supabase
          .from('daily_briefings')
          .insert({
            stan_id: stan.id,
            date: today,
            content: JSON.stringify(briefingContent),
            topics: briefingContent.topics,
            search_sources: briefingContent.searchSources || [],
            images: briefingContent.images || [],
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (saveError) throw saveError;

        results.push({
          stan: stan.name,
          success: true,
          topicCount: briefingContent.topics.length,
          imageCount: briefingContent.images?.length || 0
        });

        console.log(`✅ Generated Perplexity briefing for ${stan.name} with ${briefingContent.topics.length} topics and ${briefingContent.images?.length || 0} images`);
        
        // Add delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.error(`❌ Failed to generate Perplexity briefing for ${stan.name}:`, error);
        errors.push({
          stan: stan.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Create fallback briefing
        try {
          await supabase
            .from('daily_briefings')
            .insert({
              stan_id: stan.id,
              date: today,
              content: JSON.stringify({
                topics: [{
                  title: "📰 Daily Update",
                  content: `Unable to generate live briefing for ${stan.name} today. Please try again later.`,
                  sources: []
                }]
              }),
              topics: [{
                title: "📰 Daily Update",
                content: `Unable to generate live briefing for ${stan.name} today. Please try again later.`,
                sources: []
              }],
              search_sources: [],
              images: [],
              created_at: new Date().toISOString(),
            });
        } catch (fallbackError) {
          console.error(`❌ Failed to create fallback briefing for ${stan.name}:`, fallbackError);
        }
      }
    }

    console.log(`🎉 Successfully generated ${results.length} Perplexity briefings`);

    return NextResponse.json({ 
      success: true,
      message: `Generated ${results.length} daily briefings with Perplexity`,
      date: today,
      results: results,
      errors: errors,
      totalStans: stans.length,
      successCount: results.length,
      errorCount: errors.length,
      source: 'Perplexity API with real-time web search'
    });

  } catch (error) {
    console.error('Error generating daily briefings with Perplexity:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate daily briefings',
        message: error instanceof Error ? error.message : 'Unknown error',
        source: 'Perplexity API'
      },
      { status: 500 }
    );
  }
}

