import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { aggregations, columnInfo, totalRows } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a business analyst that explains data insights to non-technical people (like a 10-year-old could understand).

You will be given AGGREGATED data summaries (already grouped, no raw rows). Your job is to produce ACTIONABLE business insights — not descriptive stats.

Return ONLY valid JSON matching this exact schema:
{
  "growth": [{"title": "string", "detail": "string"}],
  "risks": [{"title": "string", "detail": "string"}],
  "actions": [{"title": "string", "detail": "string"}],
  "trends": [{"title": "string", "detail": "string"}]
}

RULES:
- Each section: 2-4 items
- Use simple language, avoid jargon
- Be specific (mention actual region/category names from the data)
- "growth" = where to expand or invest more (high performers)
- "risks" = underperforming/loss-making areas
- "actions" = concrete next steps (improve, optimize, close, relocate, etc.)
- "trends" = what's likely to happen next based on patterns
- If data is insufficient, return empty arrays for sections you can't fill
- DO NOT wrap in markdown code blocks. Return raw JSON only.`;

    const userContent = `Dataset overview:
- Total rows: ${totalRows}
- Columns: ${columnInfo}

Aggregated summaries:
${JSON.stringify(aggregations, null, 2)}

Generate prediction insights as JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // try to strip markdown fences
      const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(cleaned);
    }

    return new Response(JSON.stringify({ insights: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("prediction-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});