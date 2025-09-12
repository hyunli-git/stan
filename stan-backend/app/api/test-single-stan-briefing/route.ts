import { NextResponse } from 'next/server';

export async function POST() {
  try {
    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json({
        error: 'Google AI API key not configured'
      }, { status: 500 });
    }

    console.log('🧪 Testing single stan briefing generation with Google Search Grounding...');

    const testStan = {
      id: 'test-stan-123',
      name: 'BTS',
      user_id: '00000000-0000-0000-0000-000000000000',
      description: 'K-pop boy band',
      categories: {
        name: 'K-Pop',
        icon: '🎵',
        color: '#FF6B6B'
      }
    };

    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    const prompt = `Search the web for current information about "${testStan.name}" and return ONLY valid JSON in this exact format:

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

Context: ${testStan.name} - ${testStan.categories.name} - ${testStan.description}
Today: ${today}

CRITICAL REQUIREMENTS:
- Return ONLY the JSON object, no explanation text, no markdown formatting
- Do NOT use quotes within the content text (use apostrophes instead)
- Keep URLs complete and valid
- Each topic content should be 2-3 sentences maximum`;

    console.log('🌐 Using Gemini 2.0 Flash with Google Search Grounding for:', testStan.name);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
        tools: [{
          googleSearch: {}
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const briefingText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
    
    console.log('📄 Response Text Length:', briefingText.length);
    console.log('🔗 Has Grounding Metadata:', !!groundingMetadata);
    
    if (groundingMetadata) {
      console.log('🎉 SUCCESS! Google Search Grounding worked!');
      console.log('📊 Search queries:', groundingMetadata.webSearchQueries?.length || 0);
      console.log('📚 Sources found:', groundingMetadata.groundingChunks?.length || 0);
    }

    // Try to parse JSON using improved parsing
    let parsedBriefing = null;
    try {
      console.log('🔍 Raw Gemini response:', briefingText.substring(0, 300) + '...');
      
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
        console.log('🔍 Found JSON match:', jsonMatch.substring(0, 200) + '...');
        
        let cleanJson = jsonMatch
          .replace(/\/\/.*$/gm, '') // Remove comments
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/\\\\\"/g, '\\"') // Fix double escaped quotes
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

        // Fix any remaining unescaped quotes
        cleanJson = cleanJson.replace(/([^\\])"([^"]*?)"(?![:\],}])/g, '$1\\"$2\\"');
        
        console.log('🧹 Cleaned JSON:', cleanJson.substring(0, 300) + '...');
        
        parsedBriefing = JSON.parse(cleanJson);
        console.log('✅ Successfully parsed JSON with', parsedBriefing.topics?.length || 0, 'topics');
      }
    } catch (parseError) {
      console.log('❌ Failed to parse JSON:', parseError);
      console.log('❌ Raw response that failed:', briefingText.substring(0, 500));
    }

    let topics = [];
    let searchSources = [];
    
    if (parsedBriefing?.topics) {
      topics = parsedBriefing.topics;
      searchSources = parsedBriefing.searchSources || [];
      console.log('✅ Successfully parsed structured briefing with', topics.length, 'topics');
    } else {
      // Fallback: Extract topics from the structured text
      console.log('📝 Using smart fallback parsing');
      
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
      
      console.log('📝 Extracted', topics.length, 'topics using smart fallback');
    }

    const briefingContent = {
      topics: topics,
      searchSources: searchSources,
      images: []
    };

    return NextResponse.json({
      success: true,
      stan: testStan.name,
      briefingContent,
      hasGroundingMetadata: !!groundingMetadata,
      searchQueries: groundingMetadata?.webSearchQueries || [],
      sourcesCount: groundingMetadata?.groundingChunks?.length || 0,
      rawResponseLength: briefingText.length
    });

  } catch (error) {
    console.error('❌ Single stan briefing test error:', error);
    return NextResponse.json({
      error: 'Single stan briefing test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}