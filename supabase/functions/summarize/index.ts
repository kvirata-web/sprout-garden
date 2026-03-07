import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Verify auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { name, builtBy, builtFor, capability, problemSpace, dataSource, impact } = await req.json();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `You are helping document an internal AI project at Sprout, a company going through an AI transformation. Write a single clear paragraph (2-3 sentences, max 60 words) describing this project for an internal company directory. Make it concrete, outcome-focused, and easy for non-technical employees to understand. Do not use jargon. Do not start with "This project".

Project Name: ${name}
Built by: ${builtBy} team
Built for: ${builtFor} team
AI Capability: ${capability}
Problem Space: ${problemSpace}
Data Source: ${dataSource || "internal data"}
Expected Impact: ${impact || "TBD"}

Respond with ONLY the paragraph, no preamble.`,
      }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text ?? null;

  return new Response(JSON.stringify({ text }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
