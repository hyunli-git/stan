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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    const today = new Date().toISOString().split("T")[0];

    let query = supabase
      .from("daily_briefings")
      .select(`
        id,
        date,
        content,
        summary,
        topics,
        sources,
        created_at,
        artists (
          id,
          name,
          category,
          image_url
        )
      `)
      .eq("date", today)
      .order("created_at", { ascending: false });

    // If user is logged in, filter by followed artists
    if (userId) {
      const { data: follows } = await supabase
        .from("user_follows")
        .select("artist_id")
        .eq("user_id", userId);

      if (follows && follows.length > 0) {
        const artistIds = follows.map(f => f.artist_id);
        query = query.in("artist_id", artistIds);
      }
      // If user has no follows, show all briefings
    }

    const { data: briefings, error } = await query;

    if (error) throw error;

    // Transform data for frontend
    const feed = briefings.map(b => ({
      id: b.id,
      date: b.date,
      content: b.content,
      summary: b.summary,
      topics: b.topics,
      sources: b.sources,
      created_at: b.created_at,
      artist: b.artists,
    }));

    return new Response(
      JSON.stringify({ briefings: feed }),
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
