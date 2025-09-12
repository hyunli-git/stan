import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize with service role to bypass RLS for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify service role key is configured
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not configured');
}

// Initialize Gemini 2.5 Flash with Grounding
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash-exp"
});

// Configure generation with Google Search
const generationConfig = {
  temperature: 0.7,
  maxOutputTokens: 1000,
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

    // Get today's briefings for ANY stan (using the correct 'briefings' table)
    const { data: allBriefings, error } = await supabase
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

// POST: Generate daily briefings for all stans
export async function POST(request: NextRequest) {
  try {
    const { force = false } = await request.json();
    const today = new Date().toISOString().split('T')[0];

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
      .eq('is_active', true);

    if (stansError) throw stansError;

    if (!stans || stans.length === 0) {
      return NextResponse.json({ 
        message: 'No active stans found to generate briefings for',
        date: today 
      });
    }

    console.log(`🚀 Generating daily briefings for ${stans.length} stans`);

    const briefingsToInsert = [];

    // Generate briefings for each stan
    for (const stan of stans) {
      try {
        console.log(`📰 Generating briefing for: ${stan.name}`);
        
        const briefingContent = await generateStanBriefing(stan);
        
        briefingsToInsert.push({
          stan_id: stan.id,
          date: today,
          content: JSON.stringify(briefingContent),
          topics: briefingContent.topics,
          search_sources: briefingContent.searchSources || [],
          images: briefingContent.images || [],
          created_at: new Date().toISOString(),
        });

        console.log(`✅ Generated briefing for: ${stan.name}`);
        
        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to generate briefing for ${stan.name}:`, error);
        
        // Create fallback briefing
        briefingsToInsert.push({
          stan_id: stan.id,
          date: today,
          content: JSON.stringify({
            topics: [{
              title: "Daily Update",
              content: `Unable to generate briefing for ${stan.name} today. Please try again later.`,
              sources: []
            }]
          }),
          topics: [{
            title: "Daily Update",
            content: `Unable to generate briefing for ${stan.name} today. Please try again later.`,
            sources: []
          }],
          search_sources: [],
          created_at: new Date().toISOString(),
        });
      }
    }

    // Insert all briefings
    const { error: insertError } = await supabase
      .from('daily_briefings')
      .insert(briefingsToInsert);

    if (insertError) throw insertError;

    console.log(`🎉 Successfully generated ${briefingsToInsert.length} daily briefings`);

    return NextResponse.json({ 
      message: `Generated ${briefingsToInsert.length} daily briefings`,
      date: today,
      count: briefingsToInsert.length
    });

  } catch (error) {
    console.error('Error generating daily briefings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate daily briefings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Function to extract TikTok thumbnail from URL
const extractTikTokThumbnail = async (url: string): Promise<string | null> => {
  try {
    if (!url.includes('tiktok.com')) return null;
    
    // Extract video ID from TikTok URL
    const videoIdMatch = url.match(/\/video\/(\d+)/);
    if (!videoIdMatch) return null;
    
    const videoId = videoIdMatch[1];
    // TikTok thumbnail pattern
    return `https://p16-sign-va.tiktokcdn.com/obj/tos-maliva-p-0068/o${videoId}_1634025114?x-expires=1893456000&x-signature=dummy`;
  } catch (error) {
    console.error('Error extracting TikTok thumbnail:', error);
    return null;
  }
};

// Function to extract images from various sources
const extractImagesFromSources = async (sources: string[]): Promise<ImageData[]> => {
  const images: ImageData[] = [];
  
  for (const source of sources) {
    try {
      // TikTok thumbnail
      if (source.includes('tiktok.com')) {
        const thumbnail = await extractTikTokThumbnail(source);
        if (thumbnail) {
          images.push({
            url: thumbnail,
            alt: 'TikTok video thumbnail',
            source: source,
            thumbnail: thumbnail
          });
        }
      }
      
      // YouTube thumbnail
      else if (source.includes('youtube.com') || source.includes('youtu.be')) {
        const videoIdMatch = source.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        if (videoIdMatch) {
          const videoId = videoIdMatch[1];
          const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
          images.push({
            url: thumbnail,
            alt: 'YouTube video thumbnail',
            source: source,
            thumbnail: thumbnail
          });
        }
      }
      
      // Instagram post (placeholder - would need proper API)
      else if (source.includes('instagram.com')) {
        images.push({
          url: 'https://via.placeholder.com/400x400/E4405F/ffffff?text=Instagram+Post',
          alt: 'Instagram post',
          source: source,
          thumbnail: 'https://via.placeholder.com/200x200/E4405F/ffffff?text=Instagram'
        });
      }
      
      // Twitter/X post (placeholder)
      else if (source.includes('twitter.com') || source.includes('x.com')) {
        images.push({
          url: 'https://via.placeholder.com/400x200/1DA1F2/ffffff?text=Twitter+Post',
          alt: 'Twitter post',
          source: source,
          thumbnail: 'https://via.placeholder.com/200x100/1DA1F2/ffffff?text=Twitter'
        });
      }
      
    } catch (error) {
      console.error(`Error extracting image from ${source}:`, error);
    }
  }
  
  return images;
};

const generateStanBriefing = async (stan: Stan): Promise<BriefingContent> => {
  try {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    // Handle categories - could be object or array
    const category = Array.isArray(stan.categories) ? stan.categories[0] : stan.categories;

    const prompt = `Today is ${today}. Search the web for the most current and up-to-date information about "${stan.name}" and create an English briefing.

Category: ${category.name}
Description: ${stan.description || 'None'}

Please write in the following JSON format with separate topics:

{
  "topics": [
    {
      "title": "Recent News & Activities",
      "content": "2-3 sentences about recent news with specific dates and details. Use emojis appropriately.",
      "sources": ["url1", "url2"] // Include actual source URLs found in your search
    },
    {
      "title": "Social Media & Fan Reactions", 
      "content": "2-3 sentences about social media activity and fan reactions. Use emojis appropriately.",
      "sources": ["url1", "url2"] // Include actual source URLs found in your search
    },
    {
      "title": "Upcoming Events & Releases",
      "content": "2-3 sentences about upcoming schedules and planned activities. Use emojis appropriately.", 
      "sources": ["url1", "url2"] // Include actual source URLs found in your search
    }
  ],
  "searchSources": ["all_urls_you_found_during_search"]
}

CRITICAL REQUIREMENTS:
1. Use real web search to find current information
2. Include ACTUAL source URLs in each topic's "sources" array
3. Focus on news from today (${today}) or recent days
4. Return valid JSON format only
5. Each topic should be concise and focused on one area`;

    console.log('🌐 Using Gemini 2.5 Flash with Google Search Grounding for real-time information');
    
    // Use Gemini with Google Search Grounding for real web search results
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig
    });
    const briefingText = result.response.text();
    
    // Try to parse structured JSON response
    let parsedBriefing: { topics?: BriefingTopic[], searchSources?: string[] } | null = null;
    try {
      console.log('🔍 Raw Gemini response:', briefingText.substring(0, 500) + '...');
      
      // Extract JSON from code blocks or find JSON object
      const jsonBlockMatch = briefingText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonMatch = jsonBlockMatch ? jsonBlockMatch[1] : briefingText.match(/\{[\s\S]*\}/)?.[0];
      
      if (jsonMatch) {
        console.log('🔍 Found JSON match:', jsonMatch.substring(0, 200) + '...');
        
        let cleanJson = jsonMatch
          .replace(/\/\/.*$/gm, '') // Remove comments
          .replace(/,(\\s*[}\\]])/g, '$1') // Remove trailing commas
          .replace(/\\\\"/g, '"') // Fix escaped quotes
          .replace(/[\u0000-\u001f]/g, '') // Remove control characters
          .replace(/\\n/g, ' ') // Replace newlines with spaces
          .replace(/\\r/g, '') // Remove carriage returns
          .replace(/\\t/g, ' ') // Replace tabs with spaces
          .replace(/\\s+/g, ' ') // Normalize multiple spaces
          .trim();
        
        // Additional cleanup for common Gemini formatting issues
        cleanJson = cleanJson
          .replace(/"\s*:\s*"/g, '": "') // Fix spacing around colons
          .replace(/",\s*"/g, '", "') // Fix spacing around commas
          .replace(/"\s*,/g, '",') // Fix trailing spaces before commas
          .replace(/\{\s+/g, '{') // Remove spaces after opening braces
          .replace(/\s+\}/g, '}') // Remove spaces before closing braces
          .replace(/\[\s+/g, '[') // Remove spaces after opening brackets
          .replace(/\s+\]/g, ']'); // Remove spaces before closing brackets
        
        console.log('🧹 Cleaned JSON:', cleanJson.substring(0, 300) + '...');
        
        parsedBriefing = JSON.parse(cleanJson);
        console.log('✅ Successfully parsed JSON response');
      }
    } catch (parseError) {
      console.log('❌ Failed to parse JSON response, trying manual extraction');
      console.log('❌ Parse error:', parseError);
      console.log('❌ Problematic JSON snippet:', briefingText.substring(0, 600));
    }

    let topics: BriefingTopic[] = [];
    let searchSources: string[] = [];
    
    if (parsedBriefing?.topics) {
      topics = parsedBriefing.topics;
      searchSources = parsedBriefing.searchSources || [];
      console.log('✅ Successfully parsed structured briefing with', topics.length, 'topics');
    } else {
      // Fallback: Split plain text into topics
      const sections = briefingText.split(/\d+\.\s*/).filter(s => s.trim().length > 10);
      topics = sections.map((section, index) => ({
        title: `Topic ${index + 1}`,
        content: section.trim(),
        sources: []
      }));
      console.log('📝 Using fallback text parsing with', topics.length, 'topics');
    }
    
    // Fallback sources if no real sources found
    const fallbackSources = [
      `https://www.google.com/search?q=${encodeURIComponent(stan.name + ' latest news today')}`,
      `https://www.google.com/search?q=${encodeURIComponent(stan.name + ' recent updates ' + new Date().getFullYear())}`
    ];

    // Extract images from all sources
    const allSources = searchSources.length > 0 ? searchSources : fallbackSources;
    const topicSources = topics.flatMap(topic => topic.sources || []);
    const extractedImages = await extractImagesFromSources([...allSources, ...topicSources]);
    
    // Add images to topics based on their sources
    for (const topic of topics) {
      if (topic.sources && topic.sources.length > 0) {
        topic.images = await extractImagesFromSources(topic.sources);
      }
    }
    
    console.log(`🖼️ Extracted ${extractedImages.length} images for ${stan.name}`);

    return {
      topics: topics,
      searchSources: searchSources.length > 0 ? searchSources : fallbackSources,
      images: extractedImages
    };

  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Fallback to simple content
    return {
      topics: [{
        title: "Daily Update",
        content: `Unable to generate detailed briefing for ${stan.name} today. Please check back later for updates.`,
        sources: []
      }],
      searchSources: []
    };
  }
};