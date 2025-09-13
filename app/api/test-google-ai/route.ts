import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST() {
  try {
    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json({
        error: 'Google AI API key not configured'
      }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp" 
    });

    const prompt = `Search the web for current news about "Taylor Swift" and return the results in JSON format:

{
  "topics": [
    {
      "title": "Recent News",
      "content": "Brief description of recent news",
      "sources": ["url1", "url2"]
    }
  ]
}`;

    console.log('🧪 Testing Google AI with search grounding...');
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    });
    
    const responseText = result.response.text();
    console.log('✅ Google AI Response:', responseText);

    return NextResponse.json({
      success: true,
      prompt,
      response: responseText,
      apiKeyConfigured: true
    });

  } catch (error) {
    console.error('❌ Google AI Test Error:', error);
    return NextResponse.json({
      error: 'Google AI test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      apiKeyConfigured: !!process.env.GOOGLE_AI_API_KEY
    }, { status: 500 });
  }
}