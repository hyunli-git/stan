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

    // Get all artists
    const { data: artists, error } = await supabase
      .from("artists")
      .select("*")
      .order("name");

    if (error) throw error;

    // If user is provided, include follow status
    if (userId) {
      const { data: follows } = await supabase
        .from("user_follows")
        .select("artist_id")
        .eq("user_id", userId);

      const followedIds = new Set(follows?.map(f => f.artist_id) || []);

      const artistsWithFollow = artists.map(a => ({
        ...a,
        is_followed: followedIds.has(a.id),
      }));

      return new Response(
        JSON.stringify({ artists: artistsWithFollow }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ artists }),
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
