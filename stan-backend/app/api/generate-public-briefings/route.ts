import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Gemini with Grounding for real web search
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash-exp"
});

const generationConfig = {
  temperature: 0.7,
  maxOutputTokens: 1000,
};

// Popular stans to generate briefings for (no user needed)
const PUBLIC_STANS = [
  { id: 'public-bts', name: 'BTS', category: 'K-Pop', description: 'Global K-Pop superstars' },
  { id: 'public-taylor', name: 'Taylor Swift', category: 'Music', description: 'Pop music icon' },
  { id: 'public-blackpink', name: 'BLACKPINK', category: 'K-Pop', description: 'K-Pop girl group' },
  { id: 'public-lakers', name: 'Los Angeles Lakers', category: 'Sports', description: 'NBA basketball team' },
  { id: 'public-marvel', name: 'Marvel Cinematic Universe', category: 'Movies', description: 'Superhero franchise' },
  { id: 'public-lol', name: 'League of Legends', category: 'Gaming', description: 'Popular esports game' }
];

interface ImageData {
  url: string;
  alt: string;
  source: string;
  thumbnail?: string;
}

// Extract images from sources
const extractImagesFromSources = async (sources: string[]): Promise<ImageData[]> => {
  const images: ImageData[] = [];
  
  for (const source of sources) {
    try {
      if (source.includes('tiktok.com')) {
        const videoIdMatch = source.match(/\/video\/(\d+)/);
        if (videoIdMatch) {
          images.push({
            url: `https://p16-sign-va.tiktokcdn.com/obj/${videoIdMatch[1]}_cover`,
            alt: 'TikTok video thumbnail',
            source: source,
            thumbnail: `https://p16-sign-va.tiktokcdn.com/obj/${videoIdMatch[1]}_cover`
          });
        }
      }
      else if (source.includes('youtube.com') || source.includes('youtu.be')) {
        const videoIdMatch = source.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        if (videoIdMatch) {
          images.push({
            url: `https://img.youtube.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`,
            alt: 'YouTube video thumbnail',
            source: source,
            thumbnail: `https://img.youtube.com/vi/${videoIdMatch[1]}/hqdefault.jpg`
          });
        }
      }
    } catch (error) {
      console.error(`Error extracting image from ${source}:`, error);
    }
  }
  
  return images;
};

// Generate real briefing using Gemini with web search
const generateRealBriefing = async (stan: typeof PUBLIC_STANS[0]) => {
  try {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    const prompt = `Today is ${today}. Search the web for the MOST CURRENT real-time information about "${stan.name}" from TODAY or the past 24 hours.

Category: ${stan.category}
Description: ${stan.description}

CRITICAL: Use real web search to find actual news from today. Include REAL URLs from your search.

Return in this JSON format:
{
  "topics": [
    {
      "title": "Breaking News & Latest Updates",
      "content": "2-3 sentences about REAL news from TODAY with specific details, times, and facts. Use emojis.",
      "sources": ["actual_url_1", "actual_url_2"]
    },
    {
      "title": "Social Media Buzz",
      "content": "2-3 sentences about REAL trending topics, viral posts, or fan reactions from TODAY. Use emojis.",
      "sources": ["actual_url_3", "actual_url_4"]
    },
    {
      "title": "What's Coming Next",
      "content": "2-3 sentences about confirmed upcoming events, releases, or announcements. Use emojis.",
      "sources": ["actual_url_5", "actual_url_6"]
    }
  ],
  "searchSources": ["all_actual_urls_from_search"]
}

Requirements:
1. Use Google Search to find REAL information from TODAY
2. Include ACTUAL source URLs that exist
3. Provide CURRENT information, not generic content
4. Each topic must have different, specific information
5. Return valid JSON only`;

    console.log(`🔍 Generating real-time briefing for ${stan.name} using Gemini with web search...`);
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig
    });
    
    const responseText = result.response.text();
    
    // Parse JSON response
    let briefingData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const cleanJson = jsonMatch[0]
          .replace(/\/\/.*$/gm, '')
          .replace(/,(\s*[}\]])/g, '$1')
          .trim();
        briefingData = JSON.parse(cleanJson);
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      // Fallback structure
      briefingData = {
        topics: [{
          title: "Daily Update",
          content: `Latest updates about ${stan.name} are being compiled. Check back soon for real-time news! 📰`,
          sources: []
        }],
        searchSources: []
      };
    }

    // Extract images from sources
    const allSources = [...(briefingData.searchSources || [])];
    briefingData.topics.forEach((topic: { sources?: string[] }) => {
      allSources.push(...(topic.sources || []));
    });
    
    const images = await extractImagesFromSources(allSources);
    
    // Add images to topics
    for (const topic of briefingData.topics as { sources?: string[], images?: ImageData[] }[]) {
      if (topic.sources && topic.sources.length > 0) {
        topic.images = await extractImagesFromSources(topic.sources);
      }
    }

    return {
      ...briefingData,
      images,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`Error generating briefing for ${stan.name}:`, error);
    return {
      topics: [{
        title: "Update Pending",
        content: `Briefing for ${stan.name} is being generated. Please refresh in a moment! 🔄`,
        sources: []
      }],
      searchSources: [],
      images: [],
      error: true
    };
  }
};

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Fetching public briefings for ${today}`);

    // ALWAYS check for cached briefings first - don't generate on GET
    const { data: existingBriefings, error: fetchError } = await supabase
      .from('public_briefings')
      .select('*')
      .eq('date', today)
      .order('stan_name');

    if (fetchError) {
      console.error('Error fetching cached briefings:', fetchError);
    }

    if (existingBriefings && existingBriefings.length > 0) {
      console.log(`✅ Serving ${existingBriefings.length} cached briefings for today`);
      
      // Transform to expected format
      const briefings = existingBriefings.map(b => ({
        id: b.id,
        stan_id: b.stan_id,
        date: b.date,
        topics: b.topics,
        search_sources: b.search_sources,
        images: b.images,
        created_at: b.created_at,
        stans: b.stan_data
      }));
      
      return NextResponse.json({ 
        briefings,
        cached: true,
        date: today,
        count: briefings.length
      });
    }

    // No cached briefings - return empty or use fallback
    console.log('⚠️ No cached briefings found for today');
    console.log('💡 Briefings are generated daily at 5 AM UTC by cron job');
    
    // Return sample/fallback briefings for immediate display
    const fallbackBriefings = PUBLIC_STANS.map(stan => ({
      id: `${stan.id}-${today}`,
      stan_id: stan.id,
      date: today,
      topics: [{
        title: "Daily Briefing",
        content: `Today's briefing for ${stan.name} will be available soon. Briefings are generated fresh every morning at 5 AM UTC! 📰✨`,
        sources: []
      }],
      search_sources: [],
      images: [],
      created_at: new Date().toISOString(),
      stans: {
        id: stan.id,
        name: stan.name,
        description: stan.description,
        categories: {
          name: stan.category,
          icon: stan.category === 'K-Pop' ? '🎵' : 
                stan.category === 'Music' ? '🎸' :
                stan.category === 'Sports' ? '⚽' :
                stan.category === 'Gaming' ? '🎮' : '🎬',
          color: stan.category === 'K-Pop' ? '#FF6B6B' :
                 stan.category === 'Music' ? '#C34A36' :
                 stan.category === 'Sports' ? '#4ECDC4' :
                 stan.category === 'Gaming' ? '#845EC2' : '#F9F871'
        }
      }
    }));

    return NextResponse.json({ 
      briefings: fallbackBriefings,
      cached: false,
      fallback: true,
      date: today,
      message: 'Briefings are generated daily at 5 AM UTC. Check back then for fresh content!'
    });

  } catch (error) {
    console.error('Error generating public briefings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate public briefings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST: Force regenerate public briefings (called by cron job)
export async function POST() {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`🚀 CRON JOB: Generating public briefings for ${today}`);
    
    // Clear today's cached briefings if any
    await supabase
      .from('public_briefings')
      .delete()
      .eq('date', today);
    
    // Generate fresh briefings with real data
    const briefings = [];
    
    for (const stan of PUBLIC_STANS) {
      console.log(`📰 Generating real briefing for ${stan.name}...`);
      const briefingContent = await generateRealBriefing(stan);
      
      const briefingData = {
        id: `${stan.id}-${today}`,
        stan_id: stan.id,
        stan_name: stan.name,
        stan_category: stan.category,
        date: today,
        topics: briefingContent.topics,
        search_sources: briefingContent.searchSources || [],
        images: briefingContent.images || [],
        stan_data: {
          id: stan.id,
          name: stan.name,
          description: stan.description,
          categories: {
            name: stan.category,
            icon: stan.category === 'K-Pop' ? '🎵' : 
                  stan.category === 'Music' ? '🎸' :
                  stan.category === 'Sports' ? '⚽' :
                  stan.category === 'Gaming' ? '🎮' : '🎬',
            color: stan.category === 'K-Pop' ? '#FF6B6B' :
                   stan.category === 'Music' ? '#C34A36' :
                   stan.category === 'Sports' ? '#4ECDC4' :
                   stan.category === 'Gaming' ? '#845EC2' : '#F9F871'
          }
        },
        created_at: new Date().toISOString()
      };
      
      briefings.push(briefingData);
      
      // Save to database immediately after generating each one
      try {
        await supabase
          .from('public_briefings')
          .insert(briefingData);
        console.log(`✅ Saved briefing for ${stan.name}`);
      } catch (dbError) {
        console.error(`❌ Failed to save briefing for ${stan.name}:`, dbError);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log(`✅ CRON JOB COMPLETE: Generated ${briefings.length} briefings for ${today}`);
    
    return NextResponse.json({ 
      success: true,
      date: today,
      count: briefings.length,
      message: `Successfully generated and cached ${briefings.length} briefings`
    });
    
  } catch (error) {
    console.error('Error regenerating public briefings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to regenerate public briefings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}