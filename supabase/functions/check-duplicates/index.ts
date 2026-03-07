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

  const { newProject, candidates } = await req.json();

  if (!candidates || candidates.length === 0) {
    return new Response(JSON.stringify({ overlaps: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const projectList = candidates.map((p: { name: string; builtBy: string; builtFor: string; capability: string; problemSpace: string; description: string }) =>
    `- "${p.name}" (${p.builtBy} → ${p.builtFor}, ${p.capability}, ${p.problemSpace}): ${p.description || "no description"}`
  ).join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `You are a project deduplication assistant for an internal AI project tracker at Sprout company.

A new project is being submitted:
Name: "${newProject.name}"
Description: "${newProject.description || "No description yet"}"
AI Capability: ${newProject.capability}
Problem Space: ${newProject.problemSpace}
Built for: ${newProject.builtFor}

Existing projects in the system:
${projectList}

Identify which existing projects significantly overlap with the new one. Only flag genuine overlaps — same problem being solved, same users benefiting, or same data/approach being used. Ignore superficial matches.

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{"overlaps":[{"name":"project name","reason":"one sentence why they overlap","severity":"high|medium"}]}`,
      }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "{}";

  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return new Response(JSON.stringify({ overlaps: parsed.overlaps ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ overlaps: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
