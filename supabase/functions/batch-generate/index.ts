import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all artists
    const { data: artists, error: artistsError } = await supabase
      .from("artists")
      .select("*");

    if (artistsError) throw artistsError;

    const today = new Date().toISOString().split("T")[0];
    const results = [];

    for (const artist of artists) {
      console.log(`Generating briefing for ${artist.name}...`);

      // Check if briefing already exists for today
      const { data: existing } = await supabase
        .from("daily_briefings")
        .select("id")
        .eq("artist_id", artist.id)
        .eq("date", today)
        .single();

      if (existing) {
        console.log(`Briefing already exists for ${artist.name}`);
        results.push({ artist: artist.name, status: "skipped" });
        continue;
      }

      // Generate briefing with Gemini
      const dateStr = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const prompt = `You are STAN, an AI assistant that creates daily briefings for fans.

Create a briefing about "${artist.name}" for ${dateStr}.

Include the latest news, updates, social media highlights, and upcoming events.

IMPORTANT: Return ONLY valid JSON without any markdown code blocks. Use this exact format:
{"content": "Write the full briefing text here as a single string with proper paragraphs", "summary": "2-3 sentence summary", "topics": [{"title": "Topic 1", "content": "Details", "category": "news", "priority": 1}], "sources": []}`;

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
        console.error(`Gemini error for ${artist.name}:`, error);
        results.push({ artist: artist.name, status: "error", error });
        continue;
      }

      const geminiData = await geminiResponse.json();
      const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

      let briefing;
      try {
        briefing = JSON.parse(responseText);
      } catch {
        briefing = {
          content: responseText,
          summary: responseText.slice(0, 200),
          topics: [],
          sources: [],
        };
      }

      // Store in database
      const { error: insertError } = await supabase
        .from("daily_briefings")
        .insert({
          artist_id: artist.id,
          date: today,
          content: briefing.content,
          summary: briefing.summary,
          topics: briefing.topics || [],
          sources: briefing.sources || [],
        });

      if (insertError) {
        console.error(`Insert error for ${artist.name}:`, insertError);
        results.push({ artist: artist.name, status: "error", error: insertError.message });
      } else {
        console.log(`Successfully generated briefing for ${artist.name}`);
        results.push({ artist: artist.name, status: "success" });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Batch generation complete",
        date: today,
        results
      }),
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
