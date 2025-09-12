import { NextResponse } from 'next/server';

export async function POST() {
  try {
    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json({
        error: 'Google AI API key not configured'
      }, { status: 500 });
    }

    console.log('🧪 Testing simple Google Search Grounding...');

    // Simple test with current news question
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ 
          role: "user", 
          parts: [{ text: "What happened with Taylor Swift in September 2025? Give me current news." }] 
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
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
    console.log('🔍 Full API Response:', JSON.stringify(data, null, 2));

    const briefingText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const groundingMetadata = data.candidates?.[0]?.groundingMetadata;

    console.log('📄 Response Text:', briefingText.substring(0, 200));
    console.log('🔗 Grounding Metadata:', groundingMetadata ? 'Present' : 'Missing');

    if (groundingMetadata) {
      console.log('🎉 SUCCESS! Google Search Grounding worked!');
      console.log('📊 Search queries used:', groundingMetadata.webSearchQueries?.length || 0);
      console.log('📚 Sources found:', groundingMetadata.groundingChunks?.length || 0);
    } else {
      console.log('⚠️ No grounding metadata - search may not have activated');
    }

    return NextResponse.json({
      success: true,
      responseText: briefingText,
      hasGroundingMetadata: !!groundingMetadata,
      searchQueries: groundingMetadata?.webSearchQueries || [],
      sourcesCount: groundingMetadata?.groundingChunks?.length || 0,
      fullResponse: data
    });

  } catch (error) {
    console.error('❌ Grounding test error:', error);
    return NextResponse.json({
      error: 'Grounding test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}