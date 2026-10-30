import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getPaddleClient, type PaddleEnv } from "../_shared/paddle.ts";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Opens the payment provider's hosted portal: change plan, cancel, update card, invoices.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: auth } = await admin.auth.getUser(token);
    if (!auth.user) return json(401, { error: "Please sign in." });
    const body = await req.json().catch(() => ({}));
    const env: PaddleEnv = body.environment === "live" ? "live" : "sandbox";
    const { data: sub } = await admin.from("subscriptions").select("*")
      .eq("user_id", auth.user.id).eq("environment", env)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!sub) return json(404, { error: "No subscription found." });
    const paddle = getPaddleClient(env);
    const session = await paddle.customerPortalSessions.create(sub.paddle_customer_id, [sub.paddle_subscription_id]);
    return json(200, { url: session.urls.general.overview });
  } catch (e) {
    console.error(e);
    return json(500, { error: e instanceof Error ? e.message : "Portal failed" });
  }
});
