import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
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

// Test with Perplexity API for real-time web search
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
      "title": "💝 Personal Updates & Life Moments",
      "content": "Personal posts, life updates, family moments, or intimate shares from the artist. Include emotional fan reactions and personal details!",
      "sources": ["actual_personal_post", "actual_life_update", "actual_intimate_moment"]
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
        model: 'llama-3.1-sonar-large-128k-online', // Using large model for better understanding
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.85, // Higher temperature for more lively, creative content
        max_tokens: 1200 // More tokens for detailed responses
      })
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Try to parse JSON
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Extract all sources
        const allSources = parsed.topics.flatMap((t: { sources?: string[] }) => t.sources || []);
        
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
      console.log('Parse error:', parseError);
    }

    // Fallback
    return {
      topics: [{
        title: "Real-Time Update",
        content: content.substring(0, 200) + "...",
        sources: []
      }],
      searchSources: [],
      images: []
    };

  } catch (error) {
    console.error('Perplexity error:', error);
    return {
      topics: [{
        title: "Daily Update",
        content: `Unable to generate briefing for ${stanName} using web search. Please try again later.`,
        sources: []
      }],
      searchSources: [],
      images: []
    };
  }
};

export async function POST() {
  try {
    if (!process.env.PERPLEXITY_API_KEY) {
      return NextResponse.json({
        error: 'Perplexity API key not configured',
        message: 'Add PERPLEXITY_API_KEY to environment variables',
        setup: 'Get API key at: https://www.perplexity.ai/settings/api'
      }, { status: 500 });
    }

    // Test with just BTS first
    const testStan = {
      id: 'test',
      name: 'BTS',
      user_id: '00000000-0000-0000-0000-000000000000',
      categories: { name: 'K-Pop', icon: '🎵', color: '#FF6B6B' }
    };

    console.log('🔍 Testing Perplexity API for real-time search...');
    const briefingContent = await generateWithPerplexity(testStan.name, testStan.categories.name);

    const today = new Date().toISOString().split('T')[0];
    const briefingData = {
      stan_id: testStan.id,
      user_id: testStan.user_id,
      content: JSON.stringify(briefingContent),
      search_sources: briefingContent.searchSources || [],
      topics: briefingContent.topics,
      images: briefingContent.images || [],
      ai_generated: true,
      date: today,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Perplexity API test completed',
      briefingContent,
      source: 'Perplexity API with real-time web search'
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to test Perplexity API',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}