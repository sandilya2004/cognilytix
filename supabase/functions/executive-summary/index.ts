import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { title, fileName, columns, sampleRows, totalRows, kpis, insights } = body ?? {};

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are an executive business analyst preparing a board meeting report.
Write in plain business language for non-technical executives. Be concrete, data-driven, and concise.

REPORT TITLE: ${title ?? "Untitled"}
DATASET: ${fileName ?? "—"}
TOTAL ROWS: ${totalRows ?? "?"}
COLUMNS: ${(columns ?? []).join(", ")}

KPIs:
${JSON.stringify(kpis ?? {}, null, 2)}

SAMPLE ROWS (first few):
${JSON.stringify(sampleRows ?? [], null, 2)}

EXISTING NUMERIC INSIGHTS:
${(insights ?? []).slice(0, 10).map((s: string) => "- " + s).join("\n")}

Respond as valid JSON only, with this shape:
{
  "executiveSummary": "1 short paragraph (3-5 sentences) capturing the overall business story.",
  "keyFindings": ["...", "..."],
  "growthOpportunities": ["...", "..."],
  "riskAreas": ["...", "..."],
  "recommendations": ["specific, actionable recommendation 1", "..."],
  "predictionInsights": ["forward-looking insight 1", "..."]
}
Arrays should each have 3-5 short items. No prose outside the JSON.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI gateway error: ${aiRes.status} ${errText}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(content); } catch { parsed = { executiveSummary: content }; }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});