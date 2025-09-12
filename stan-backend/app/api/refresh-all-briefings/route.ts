import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash-exp"
});

const generationConfig = {
  temperature: 0.7,
  maxOutputTokens: 2000,
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
}

interface BriefingContent {
  topics: BriefingTopic[];
  searchSources?: string[];
  images?: unknown[];
}

const generateRealTimeBriefing = async (stan: Stan): Promise<BriefingContent> => {
  try {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    const category = Array.isArray(stan.categories) ? stan.categories[0] : stan.categories;

    const prompt = `Search the web for current information about "${stan.name}" and return ONLY valid JSON in this exact format:

{
  "topics": [
    {
      "title": "Recent News & Activities",
      "content": "Brief summary with current details about recent news and activities",
      "sources": ["url1", "url2"]
    },
    {
      "title": "Social Media & Fan Reactions", 
      "content": "Brief summary with current social media activity and fan reactions",
      "sources": ["url1", "url2"]
    },
    {
      "title": "Upcoming Events & Releases",
      "content": "Brief summary of upcoming schedule and planned activities", 
      "sources": ["url1", "url2"]
    }
  ],
  "searchSources": ["all_urls_you_found_during_search"]
}

Context: ${stan.name} - ${category.name} - ${stan.description || 'None'}
Today: ${today}

CRITICAL REQUIREMENTS:
- Return ONLY the JSON object, no explanation text, no markdown formatting
- Do NOT use quotes within the content text (use apostrophes instead)
- Keep URLs complete and valid
- Each topic content should be 2-3 sentences maximum`;

    console.log('🌐 Using Gemini 2.0 Flash with Google Search Grounding for:', stan.name);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
        tools: [{
          googleSearch: {}
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const briefingText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata) {
      console.log('🎉 Google Search Grounding worked for', stan.name, '! Found:', {
        searchQueries: groundingMetadata.webSearchQueries?.length || 0,
        sources: groundingMetadata.groundingChunks?.length || 0
      });
    }
    
    // Try to parse JSON, with smart fallback
    let topics: BriefingTopic[] = [];
    let searchSources: string[] = [];
    
    try {
      const jsonBlockMatch = briefingText.match(/```json\s*([\s\S]*?)\s*```/);
      let jsonMatch = jsonBlockMatch ? jsonBlockMatch[1] : briefingText.match(/\{[\s\S]*\}/)?.[0];
      
      if (!jsonMatch && briefingText.includes('{')) {
        const startIndex = briefingText.indexOf('{');
        const endIndex = briefingText.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          jsonMatch = briefingText.substring(startIndex, endIndex + 1);
        }
      }
      
      if (jsonMatch) {
        let cleanJson = jsonMatch
          .replace(/\/\/.*$/gm, '')
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/[\u0000-\u001f]/g, '')
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, '')
          .replace(/\\t/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // Fix truncated JSON
        if (!cleanJson.endsWith('}')) {
          const lastCompleteArrayEnd = cleanJson.lastIndexOf(']');
          const lastCompleteObjectEnd = cleanJson.lastIndexOf('}');
          
          if (lastCompleteArrayEnd > lastCompleteObjectEnd) {
            cleanJson = cleanJson.substring(0, lastCompleteArrayEnd + 1) + '}';
          } else if (lastCompleteObjectEnd !== -1) {
            cleanJson = cleanJson.substring(0, lastCompleteObjectEnd + 1) + ']}';
          }
        }

        cleanJson = cleanJson.replace(/,\s*"https?:\/\/[^"]*$/g, '');
        cleanJson = cleanJson.replace(/\[\s*"https?:\/\/[^"]*$/g, '[]');
        
        const parsedBriefing = JSON.parse(cleanJson);
        if (parsedBriefing?.topics) {
          topics = parsedBriefing.topics;
          searchSources = parsedBriefing.searchSources || [];
          console.log('✅ Successfully parsed JSON for', stan.name, 'with', topics.length, 'topics');
        }
      }
    } catch (parseError) {
      console.log('❌ JSON parsing failed for', stan.name, ', using smart fallback');
    }

    // Smart fallback extraction
    if (topics.length === 0) {
      console.log('📝 Using smart fallback parsing for', stan.name);
      
      const topicPatterns = [
        { title: "Recent News & Activities", pattern: /"title"\s*:\s*"Recent News[^"]*"[\s\S]*?"content"\s*:\s*"([^"]*)"/ },
        { title: "Social Media & Fan Reactions", pattern: /"title"\s*:\s*"Social Media[^"]*"[\s\S]*?"content"\s*:\s*"([^"]*)"/ },
        { title: "Upcoming Events & Releases", pattern: /"title"\s*:\s*"Upcoming[^"]*"[\s\S]*?"content"\s*:\s*"([^"]*)"/ }
      ];
      
      for (const topicPattern of topicPatterns) {
        const match = briefingText.match(topicPattern.pattern);
        if (match) {
          topics.push({
            title: topicPattern.title,
            content: match[1].replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim() + " (Real-time web search)",
            sources: []
          });
        }
      }
      
      if (topics.length === 0) {
        const sections = briefingText.split(/\d+\.\s*/).filter((s: string) => s.trim().length > 10);
        topics = sections.map((section: string, index: number) => ({
          title: `Real-Time Update ${index + 1}`,
          content: section.trim().substring(0, 200) + "... (Live web search)",
          sources: []
        }));
      }
      
      console.log('📝 Extracted', topics.length, 'topics using smart fallback for', stan.name);
    }
    
    const fallbackSources = [
      `https://www.google.com/search?q=${encodeURIComponent(stan.name + ' latest news today')}`,
      `https://www.google.com/search?q=${encodeURIComponent(stan.name + ' recent updates ' + new Date().getFullYear())}`
    ];
    
    return {
      topics: topics,
      searchSources: searchSources.length > 0 ? searchSources : fallbackSources,
      images: []
    };

  } catch (error) {
    console.error('Gemini API Error for', stan.name, ':', error);
    
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

export async function POST() {
  try {
    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json({
        error: 'Google AI API key not configured'
      }, { status: 500 });
    }

    const today = new Date().toISOString().split('T')[0];
    console.log('🧹 Refreshing all briefings for date:', today);

    // Step 1: Clear all existing briefings
    console.log('🗑️ Clearing existing briefings...');
    const { error: deleteError } = await supabase
      .from('briefings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except a dummy row

    if (deleteError) {
      console.error('❌ Error clearing briefings:', deleteError);
    } else {
      console.log('✅ Cleared existing briefings');
    }

    // Step 2: Get all active stans
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

    if (stansError) {
      console.error('❌ Error fetching stans:', stansError);
      throw stansError;
    }

    if (!stans || stans.length === 0) {
      console.log('⚠️ No active stans found');
      return NextResponse.json({ 
        message: 'No active stans found to generate briefings for',
        count: 0
      });
    }

    console.log(`🚀 Generating fresh real-time briefings for ${stans.length} stans using Google Search Grounding`);

    const briefingsGenerated = [];
    const errors = [];

    // Process stans in smaller batches
    const BATCH_SIZE = 3; // Smaller batches for refresh
    const batches = [];
    for (let i = 0; i < stans.length; i += BATCH_SIZE) {
      batches.push(stans.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 Processing ${batches.length} batches of ${BATCH_SIZE} stans each`);

    for (const [batchIndex, batch] of batches.entries()) {
      console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length}`);
      
      for (const stan of batch) {
        try {
          console.log(`📰 Generating fresh briefing for: ${stan.name} (${briefingsGenerated.length + 1}/${stans.length})`);
          
          const briefingContent = await generateRealTimeBriefing(stan as Stan);
          
          const briefingData = {
            stan_id: stan.id,
            user_id: stan.user_id,
            content: JSON.stringify(briefingContent),
            search_sources: briefingContent.searchSources || [],
            topics: briefingContent.topics,
            images: briefingContent.images || [],
            ai_generated: true,
            date: today,
            is_read: false,
            created_at: new Date().toISOString(),
          };

          const { data: insertData, error: insertError } = await supabase
            .from('briefings')
            .insert(briefingData)
            .select();

          if (insertError) {
            console.error(`❌ Failed to save briefing for ${stan.name}:`, insertError);
            errors.push({ stan: stan.name, error: insertError.message });
          } else if (insertData && insertData.length > 0) {
            console.log(`✅ Generated fresh real-time briefing for: ${stan.name}`);
            briefingsGenerated.push(stan.name);
          }
          
          // Delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`❌ Failed to generate briefing for ${stan.name}:`, error);
          errors.push({ 
            stan: stan.name, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
      
      // Short break between batches
      if (batchIndex < batches.length - 1) {
        console.log(`⏸️ Brief pause between batches...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Refreshed ${briefingsGenerated.length} briefings with fresh real-time content`,
      briefingsGenerated,
      totalStans: stans.length,
      errors: errors.length > 0 ? errors : undefined,
      date: today,
      source: 'Google Gemini 2.0 Flash with Search Grounding - REFRESHED'
    });

  } catch (error) {
    console.error('Error refreshing briefings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to refresh briefings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}