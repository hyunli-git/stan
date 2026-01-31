import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { stanName } = await req.json();

    if (!stanName) {
      return new Response(
        JSON.stringify({ error: "stanName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Call Gemini API
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const prompt = `You are STAN, an AI assistant that creates daily briefings for fans.

Create a briefing about "${stanName}" for ${today}.

Include the latest news, updates, social media highlights, and upcoming events.

IMPORTANT: Return ONLY valid JSON without any markdown code blocks or extra text. Use this exact format:
{"content": "Write the full briefing text here as a single string with proper paragraphs", "summary": "2-3 sentence summary", "topics": [{"title": "Topic 1", "content": "Details", "category": "news", "priority": 1, "sources": []}], "sources": []}

Make the content field a readable briefing with multiple paragraphs about recent news and updates for ${stanName} fans.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const error = await geminiResponse.text();
      console.error("Gemini API error:", error);
      throw new Error(`Gemini API error: ${error}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("Raw response:", responseText.substring(0, 500));

    // Parse JSON from response
    let briefing;
    try {
      // Try to extract JSON from code blocks first
      let jsonString = responseText;

      // Remove markdown code blocks if present
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
      }

      // Parse the JSON
      briefing = JSON.parse(jsonString);

      // If content is still JSON-like, it means we have nested JSON - extract actual content
      if (typeof briefing.content === 'string' && briefing.content.startsWith('{')) {
        try {
          const nestedContent = JSON.parse(briefing.content);
          if (nestedContent.content) {
            briefing = nestedContent;
          }
        } catch {
          // Content is not nested JSON, keep as is
        }
      }
    } catch (e) {
      console.error("JSON parse error:", e);
      // If parsing fails, create structured response from text
      // Clean up any markdown artifacts
      let cleanText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/^\s*\{[\s\S]*"content"\s*:\s*"/m, '')
        .replace(/"\s*,\s*"summary"[\s\S]*$/m, '')
        .trim();

      if (!cleanText || cleanText.startsWith('{')) {
        cleanText = `Here's the latest update for ${stanName} fans! Stay tuned for more news and updates.`;
      }

      briefing = {
        content: cleanText,
        summary: `Daily briefing for ${stanName}`,
        topics: [],
        sources: [],
      };
    }

    // Ensure content is clean text, not JSON
    if (typeof briefing.content === 'string') {
      // Remove any remaining JSON artifacts from content
      briefing.content = briefing.content
        .replace(/^```json\s*/g, '')
        .replace(/```$/g, '')
        .trim();
    }

    // Add metadata
    briefing.generated_by = "Gemini 2.5 Flash";
    briefing.stan_name = stanName;
    briefing.created_at = new Date().toISOString();

    return new Response(
      JSON.stringify(briefing),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
