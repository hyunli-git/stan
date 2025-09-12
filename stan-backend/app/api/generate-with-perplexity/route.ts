import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

// Test with Perplexity API for real-time web search
const generateWithPerplexity = async (stanName: string, category: string) => {
  try {
    const prompt = `Search the web for current news about "${stanName}" and provide 3 brief updates in JSON format:

{
  "topics": [
    {
      "title": "Recent News",
      "content": "Brief summary with current details and emojis",
      "sources": ["actual_url_1", "actual_url_2"]
    },
    {
      "title": "Social Media Buzz", 
      "content": "Brief summary with current social activity and emojis",
      "sources": ["actual_url_1", "actual_url_2"]
    },
    {
      "title": "Upcoming Events",
      "content": "Brief summary of upcoming schedule and emojis",
      "sources": ["actual_url_1", "actual_url_2"]
    }
  ]
}`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800
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
        return {
          topics: parsed.topics,
          searchSources: parsed.topics.flatMap((t: { sources?: string[] }) => t.sources || []),
          images: []
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