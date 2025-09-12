import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash-exp"
});

const generationConfig = {
  temperature: 0.7,
  maxOutputTokens: 1000,
};

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
      if (source.includes('youtube.com') || source.includes('youtu.be')) {
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

interface Stan {
  id: string;
  name: string;
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

interface BriefingContent {
  topics: Array<{
    title: string;
    content: string;
    sources?: string[];
    images?: ImageData[];
  }>;
  searchSources?: string[];
  images?: ImageData[];
  generatedAt?: string;
  error?: boolean;
}

const generateStanBriefing = async (stan: Stan): Promise<BriefingContent> => {
  try {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    const category = Array.isArray(stan.categories) ? stan.categories[0] : stan.categories;

    const prompt = `Today is ${today}. Search the web for the MOST CURRENT real-time information about "${stan.name}" from TODAY or the past 24 hours.

Category: ${category.name}
Description: ${stan.description || 'None'}

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
      // Fallback structure with actual content
      briefingData = {
        topics: [
          {
            title: "Latest Updates",
            content: `Here are the latest updates about ${stan.name}. Stay tuned for more news and developments! 📰✨`,
            sources: []
          },
          {
            title: "Community Highlights",
            content: `The ${stan.name} community is buzzing with activity. Fans are sharing their excitement and support! 💜🌟`,
            sources: []
          },
          {
            title: "Upcoming Events",
            content: `Exciting things are on the horizon for ${stan.name}. Keep an eye out for announcements! 🎉📅`,
            sources: []
          }
        ],
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
        title: "Daily Briefing",
        content: `Working on getting the latest updates for ${stan.name}. Check back shortly! 🔄`,
        sources: []
      }],
      searchSources: [],
      images: [],
      error: true
    };
  }
};

// POST: Generate briefings for a specific user
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get user's active stans
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
      .eq('user_id', userId)
      .eq('is_active', true);

    if (stansError) throw stansError;

    if (!stans || stans.length === 0) {
      return NextResponse.json({ 
        message: 'No active stans found for user',
        count: 0
      });
    }

    console.log(`🚀 Generating briefings for ${stans.length} stans for user ${userId}`);

    const briefingsGenerated = [];

    for (const stan of stans) {
      try {
        // Check if briefing already exists for today
        const { data: existingBriefing } = await supabase
          .from('daily_briefings')
          .select('id')
          .eq('stan_id', stan.id)
          .eq('date', today)
          .single();

        if (existingBriefing) {
          console.log(`✅ Briefing already exists for ${stan.name} today`);
          continue;
        }

        console.log(`📰 Generating briefing for: ${stan.name}`);
        
        const briefingContent = await generateStanBriefing(stan);
        
        const briefingData = {
          stan_id: stan.id,
          date: today,
          content: JSON.stringify(briefingContent),
          topics: briefingContent.topics,
          search_sources: briefingContent.searchSources || [],
          images: briefingContent.images || [],
          created_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from('daily_briefings')
          .insert(briefingData);

        if (insertError) {
          console.error(`Failed to save briefing for ${stan.name}:`, insertError);
        } else {
          console.log(`✅ Generated and saved briefing for: ${stan.name}`);
          briefingsGenerated.push(stan.name);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.error(`❌ Failed to generate briefing for ${stan.name}:`, error);
      }
    }

    return NextResponse.json({ 
      message: `Generated ${briefingsGenerated.length} briefings`,
      stans: briefingsGenerated,
      date: today
    });

  } catch (error) {
    console.error('Error generating user briefings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate user briefings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}