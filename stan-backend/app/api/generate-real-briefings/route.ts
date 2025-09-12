import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize with service role to bypass RLS for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Gemini 2.0 Flash with Grounding for real-time web search
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
      "content": "2-3 sentences about recent news with specific dates and details. Use emojis appropriately.",
      "sources": ["url1", "url2"]
    },
    {
      "title": "Social Media & Fan Reactions", 
      "content": "2-3 sentences about social media activity and fan reactions. Use emojis appropriately.",
      "sources": ["url1", "url2"]
    },
    {
      "title": "Upcoming Events & Releases",
      "content": "2-3 sentences about upcoming schedules and planned activities. Use emojis appropriately.", 
      "sources": ["url1", "url2"]
    }
  ],
  "searchSources": ["all_urls_you_found_during_search"]
}

Context: ${stan.name} - ${category.name} - ${stan.description || 'None'}
Today: ${today}

CRITICAL: Return ONLY the JSON object above, no explanation text, no markdown formatting, just the JSON.`;

    console.log('🌐 Using Gemini 2.0 Flash with Google Search Grounding for:', stan.name);
    
    // Use Gemini 2.0 Flash with Google Search Grounding
    // Try direct REST API call since JavaScript SDK might have different syntax
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
    
    // Check for grounding metadata
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata) {
      console.log('🎉 Google Search Grounding worked! Found metadata:', {
        searchQueries: groundingMetadata.webSearchQueries?.length || 0,
        sources: groundingMetadata.groundingChunks?.length || 0
      });
    } else {
      console.log('⚠️ No grounding metadata found - search may not have activated');
    }
    
    // Try to parse structured JSON response
    let parsedBriefing: { topics?: BriefingTopic[], searchSources?: string[] } | null = null;
    try {
      console.log('🔍 Raw Gemini response for', stan.name, ':', briefingText.substring(0, 300) + '...');
      
      // Extract JSON from code blocks or find JSON object
      const jsonBlockMatch = briefingText.match(/```json\s*([\s\S]*?)\s*```/);
      let jsonMatch = jsonBlockMatch ? jsonBlockMatch[1] : briefingText.match(/\{[\s\S]*\}/)?.[0];
      
      // If no JSON found, try to extract from the response text that starts with explanation
      if (!jsonMatch && briefingText.includes('{')) {
        const startIndex = briefingText.indexOf('{');
        const endIndex = briefingText.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          jsonMatch = briefingText.substring(startIndex, endIndex + 1);
        }
      }
      
      if (jsonMatch) {
        console.log('🔍 Found JSON match for', stan.name, ':', jsonMatch.substring(0, 200) + '...');
        
        let cleanJson = jsonMatch
          .replace(/\/\/.*$/gm, '') // Remove comments
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/[\u0000-\u001f]/g, '') // Remove control characters
          .replace(/\\n/g, ' ') // Replace newlines with spaces
          .replace(/\\r/g, '') // Remove carriage returns
          .replace(/\\t/g, ' ') // Replace tabs with spaces
          .replace(/\s+/g, ' ') // Normalize multiple spaces
          .trim();

        // Fix truncated URLs and incomplete JSON
        if (!cleanJson.endsWith('}')) {
          // Remove any incomplete/truncated parts at the end
          const lastCompleteArrayEnd = cleanJson.lastIndexOf(']');
          const lastCompleteObjectEnd = cleanJson.lastIndexOf('}');
          
          if (lastCompleteArrayEnd > lastCompleteObjectEnd) {
            // Truncated in the middle of an array
            cleanJson = cleanJson.substring(0, lastCompleteArrayEnd + 1) + '}';
          } else if (lastCompleteObjectEnd !== -1) {
            // Truncated after an object
            cleanJson = cleanJson.substring(0, lastCompleteObjectEnd + 1) + ']}';
          }
        }

        // Remove any incomplete URLs from sources arrays
        cleanJson = cleanJson.replace(/,\s*"https?:\/\/[^"]*$/g, '');
        cleanJson = cleanJson.replace(/\[\s*"https?:\/\/[^"]*$/g, '[]');
        
        console.log('🧹 Cleaned JSON for', stan.name, ':', cleanJson.substring(0, 300) + '...');
        
        // Safe parsing with proper type checking
        const parsedResult = JSON.parse(cleanJson);
        if (parsedResult && typeof parsedResult === 'object' && Array.isArray(parsedResult.topics)) {
          parsedBriefing = parsedResult as { topics: BriefingTopic[], searchSources?: string[] };
          console.log('✅ Successfully parsed JSON for', stan.name, 'with', parsedResult.topics.length, 'topics');
        }
      }
    } catch (parseError) {
      console.log('❌ Failed to parse JSON for', stan.name, ':', parseError);
      console.log('❌ Raw response that failed:', briefingText.substring(0, 500));
    }

    let topics: BriefingTopic[] = [];
    let searchSources: string[] = [];
    
    if (parsedBriefing?.topics) {
      topics = parsedBriefing.topics;
      searchSources = parsedBriefing.searchSources || [];
      console.log('✅ Successfully parsed structured briefing for', stan.name, 'with', topics.length, 'topics');
    } else {
      // Fallback: Extract topics from the structured text
      console.log('📝 Using smart fallback parsing for', stan.name);
      
      // Try to extract topics from the structured response
      const topicPatterns = [
        { title: "Recent News & Activities", pattern: /"title"\s*:\s*"Recent News[^"]*"[\s\S]*?"content"\s*:\s*"([^"]*)"/ },
        { title: "Social Media & Fan Reactions", pattern: /"title"\s*:\s*"Social Media[^"]*"[\s\S]*?"content"\s*:\s*"([^"]*)"/ },
        { title: "Upcoming Events & Releases", pattern: /"title"\s*:\s*"Upcoming[^"]*"[\s\S]*?"content"\s*:\s*"([^"]*)"/ }
      ];
      
      topics = [];
      
      for (const topicPattern of topicPatterns) {
        const match = briefingText.match(topicPattern.pattern);
        if (match) {
          topics.push({
            title: topicPattern.title,
            content: match[1].replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim() + " (Generated from real-time web search)",
            sources: []
          });
        }
      }
      
      // If no structured topics found, use generic approach
      if (topics.length === 0) {
        const sections = briefingText.split(/\d+\.\s*/).filter((s: string) => s.trim().length > 10);
        topics = sections.map((section: string, index: number) => ({
          title: `Real-Time Update ${index + 1}`,
          content: section.trim().substring(0, 200) + "... (Generated from live web search)",
          sources: []
        }));
      }
      
      console.log('📝 Extracted', topics.length, 'topics using smart fallback for', stan.name);
    }
    
    // Fallback sources if no real sources found
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
    
    // Fallback content
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
        error: 'Google AI API key not configured',
        message: 'Please add GOOGLE_AI_API_KEY environment variable in Vercel settings',
        setup: 'Get your API key at: https://aistudio.google.com/app/apikey'
      }, { status: 500 });
    }

    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Generating real-time briefings for date:', today);

    // Get ALL active stans with their categories using correct table relationships
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

    console.log(`🚀 Generating real-time briefings for ${stans.length} stans using Google Search`);

    const briefingsGenerated = [];
    const errors = [];
    
    // Process stans in smaller batches to avoid timeout
    const BATCH_SIZE = 5;
    const batches = [];
    for (let i = 0; i < stans.length; i += BATCH_SIZE) {
      batches.push(stans.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 Processing ${batches.length} batches of ${BATCH_SIZE} stans each`);

    // Process each batch
    for (const [batchIndex, batch] of batches.entries()) {
      console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length}`);
      
      // Process stans in current batch sequentially
      for (const stan of batch) {
        try {
          console.log(`📰 Generating real-time briefing for: ${stan.name} (${briefingsGenerated.length + 1}/${stans.length})`);
          
          // Delete existing briefing if any (using correct briefings table)
          await supabase
            .from('briefings')
            .delete()
            .eq('stan_id', stan.id)
            .eq('date', today);

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
            console.log(`✅ Generated real-time briefing for: ${stan.name} (${briefingsGenerated.length + 1}/${stans.length})`);
            briefingsGenerated.push(stan.name);
          }
          
          // Add delay to avoid rate limits (reduced for batched processing)
          await new Promise(resolve => setTimeout(resolve, 1500));
          
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
      message: `Generated ${briefingsGenerated.length} real-time briefings with live web search data`,
      briefingsGenerated,
      totalStans: stans.length,
      errors: errors.length > 0 ? errors : undefined,
      date: today,
      source: 'Google Gemini 2.0 Flash with Search Grounding'
    });

  } catch (error) {
    console.error('Error generating real-time briefings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate real-time briefings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}