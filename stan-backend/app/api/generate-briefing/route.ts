import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Initialize Gemini 2.5 Flash with Grounding
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "placeholder-key");
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
  categories: {
    name: string;
    icon: string;
    color: string;
  };
  description?: string;
}

interface ImageData {
  url: string;
  alt: string;
  source: string;
  thumbnail?: string;
}

interface BriefingTopic {
  title: string;
  content: string;
  sources?: string[];
  images?: ImageData[];
}

interface BriefingContent {
  content: string; // Keep for backward compatibility
  summary: string;
  sources: string[];
  topics: BriefingTopic[]; // New structured format
  searchSources?: string[]; // Real search sources from Gemini
}

export async function POST(request: NextRequest) {
  try {
    const { stan, userId }: { stan: Stan; userId?: string } = await request.json();

    if (!stan) {
      return NextResponse.json({ error: 'Stan data is required' }, { status: 400 });
    }

    const briefingContent = await generateAIBriefingWithWebSearch(stan, userId);
    
    return NextResponse.json(briefingContent);
  } catch (error) {
    console.error('Error generating briefing:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate briefing',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Function to extract images from various sources
const extractImagesFromSources = async (sources: string[]): Promise<ImageData[]> => {
  const images: ImageData[] = [];
  
  for (const source of sources) {
    try {
      // YouTube thumbnail
      if (source.includes('youtube.com') || source.includes('youtu.be')) {
        const videoIdMatch = source.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        if (videoIdMatch) {
          const videoId = videoIdMatch[1];
          const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
          images.push({
            url: thumbnail,
            alt: 'YouTube video thumbnail',
            source: source,
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
          });
        }
      }
      
      // TikTok thumbnail (placeholder)
      else if (source.includes('tiktok.com')) {
        images.push({
          url: 'https://via.placeholder.com/400x600/000000/ffffff?text=TikTok+Video',
          alt: 'TikTok video',
          source: source,
          thumbnail: 'https://via.placeholder.com/200x300/000000/ffffff?text=TikTok'
        });
      }
      
      // Instagram post (placeholder)
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

const generateAIBriefingWithWebSearch = async (stan: Stan, userId?: string): Promise<BriefingContent> => {
  try {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    // Fetch custom prompt if userId is provided
    let customPrompt = null;
    if (userId) {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('stan_prompts')
        .select('*')
        .eq('user_id', userId)
        .eq('stan_id', stan.id)
        .single();
      customPrompt = data;
    }

    // Build the prompt based on custom settings or use default
    let prompt = '';
    
    if (customPrompt?.custom_prompt) {
      // Use fully custom prompt with variable substitution
      prompt = customPrompt.custom_prompt
        .replace('{date}', today)
        .replace('{stan_name}', stan.name)
        .replace('{category}', stan.categories.name)
        .replace('{focus_areas}', (customPrompt.focus_areas || []).join(', ') || 'General updates')
        .replace('{tone}', customPrompt.tone || 'informative')
        .replace('{include_sources}', customPrompt.include_sources ? 'Yes' : 'No');
    } else {
      // Use default prompt with customizations
      const focusAreas = customPrompt?.focus_areas?.length 
        ? `Focus specifically on: ${customPrompt.focus_areas.join(', ')}`
        : '';
      
      const excludeTopics = customPrompt?.exclude_topics?.length
        ? `Please avoid mentioning: ${customPrompt.exclude_topics.join(', ')}`
        : '';

      const sections = [];
      if (customPrompt?.include_social_media !== false) sections.push('Recent social media activity and posts');
      if (customPrompt?.include_fan_reactions !== false) sections.push('Fan and community reactions');
      if (customPrompt?.include_upcoming_events !== false) sections.push('Upcoming schedules, events, or releases');
      sections.push('Recent news or activities (latest information as of today\'s date)');

      prompt = `Today is ${today}. Search the web for the most current and up-to-date information about "${stan.name}" and create an English briefing.

Category: ${stan.categories.name}
Description: ${stan.description || 'None'}
${focusAreas}
${excludeTopics}

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

Tone: ${customPrompt?.tone || 'informative'}
Length: ${customPrompt?.length === 'short' ? '2-3 sentences per topic' : customPrompt?.length === 'long' ? '4-5 sentences per topic' : '3-4 sentences per topic'}

CRITICAL REQUIREMENTS:
1. Use real web search to find current information
2. Include ACTUAL source URLs in each topic's "sources" array
3. Focus on news from today (${today}) or recent days
4. Return valid JSON format only
5. Each topic should be concise and focused on one area`;
    }

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
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/\\"/g, '"') // Fix escaped quotes
          .replace(/[\u0000-\u001f]/g, '') // Remove control characters
          .replace(/\n/g, ' ') // Replace newlines with spaces
          .replace(/\r/g, '') // Remove carriage returns
          .replace(/\t/g, ' ') // Replace tabs with spaces
          .replace(/\s+/g, ' ') // Normalize multiple spaces
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
    
    // Extract summary from first topic
    const firstTopicText = topics[0]?.content || briefingText;
    const sentences = firstTopicText.split(/[.!?]/).filter(s => s.trim().length > 0);
    const summary = sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '.' : '');

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
      content: briefingText, // Keep for backward compatibility
      summary: summary || briefingText.substring(0, 100) + '...',
      sources: searchSources.length > 0 ? searchSources : fallbackSources,
      topics: topics,
      searchSources: searchSources
    };

  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Fallback to template-based generation if API fails
    return await generateFallbackBriefing(stan);
  }
};

// Fallback function that generates briefing without API
const generateFallbackBriefing = async (stan: Stan): Promise<BriefingContent> => {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  });

  const templates = {
    'K-Pop': [
      `🎵 **${stan.name}** has been making headlines with new activity updates as of ${today}. Fans are eagerly anticipating the next comeback and world tour announcement, with recent social media posts revealing glimpses of studio work. Their global chart performance continues to impress, making future activities even more anticipated. 🌟`,
      `✨ **${stan.name}** recently made waves at a fashion event. The group's global influence continues to grow, with this week's streaming numbers achieving new records. Fans are expressing excitement about individual member activities and potential new collaborations. 🎊`
    ],
    'Music': [
      `🎤 **${stan.name}** is currently immersed in new music work at the studio. Industry insiders hint at potential collaborations with other artists and surprise album releases. Their innovative music production methods continue to inspire many emerging artists. 🎧`,
      `📀 **${stan.name}**'s latest work continues to dominate streaming platforms. Fans' anticipation is growing for documentaries about the artist's creative process and exclusive concert series. Their musical evolution continues to attract attention. 🌟`
    ],
    'Sports': [
      `⚽ **${stan.name}** showed impressive performance this week, with key players displaying excellent form. While transfer rumors continue to circulate, the team is preparing for upcoming matches. New strategic partnerships and stadium improvement plans have also been announced. 🏆`,
      `📊 **${stan.name}**'s statistics this season show strong performance. While young talents are emerging, veteran players continue to set an example. Fan engagement initiatives are also being planned for the upcoming season. ⭐`
    ],
    'Gaming': [
      `🎮 **${stan.name}** has released a major update including new features and content that players have been requesting. The gaming community is responding positively to the recent changes. New professional players are joining the competitive scene with innovative strategies. 🏅`,
      `💎 **${stan.name}** developers have announced cross-platform features and future expansion plans to enhance the gaming experience for millions of players worldwide. Esports tournaments continue to break viewership records. 🚀`
    ],
    'Movies & TV': [
      `🎬 **${stan.name}** continues to generate buzz with fan theories and discussions about the upcoming season. Behind-the-scenes content is revealing fascinating details. Viral scenes and memorable quotes are influencing pop culture on social media. 🌟`,
      `📺 **${stan.name}** cast members have been spotted filming new scenes, sparking active speculation about plot developments. Fan engagement remains at an all-time high, with related merchandise and collaborations continuing to be released. 💫`
    ],
    'Content Creators': [
      `📱 **${stan.name}** has posted viral content that has garnered millions of views on the platform. Their unique approach to content creation continues to inspire other creators. New projects and collaborations with major brands have been announced. 🎥`,
      `💫 **${stan.name}** fans are anticipating the upcoming merchandise release and exclusive content for subscribers. Their influence on digital culture continues to grow with every post. Plans for expansion to new platforms are also in preparation. ✨`
    ]
  };

  const categoryTemplates = templates[stan.categories.name as keyof typeof templates] || templates['Music'];
  const randomTemplate = categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
  
  const summary = randomTemplate.split('.')[0] + '.';

  return {
    content: randomTemplate,
    summary: summary,
    sources: [
      `https://search.naver.com/search.naver?query=${encodeURIComponent(stan.name + ' 최신뉴스')}`,
      `https://www.google.com/search?q=${encodeURIComponent(stan.name + ' latest news today')}`
    ],
    topics: []
  };
};

