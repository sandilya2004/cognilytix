import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Server-side plan enforcement for AI analyses. Counts an analysis only when
// the wrapped handler returns a successful response.
type Handler = (req: Request) => Response | Promise<Response>;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function withAnalysisGate(feature: string, handler: Handler): Handler {
  return async (req: Request) => {
    if (req.method === "OPTIONS") return handler(req);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: settings } = await admin.from("app_settings").select("preview_mode").eq("id", true).maybeSingle();
    const preview = settings?.preview_mode ?? true;

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    let userId: string | null = null;
    if (token) {
      const { data } = await admin.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    if (!userId && !preview) {
      return json(401, { error: "Please sign in to run an analysis.", code: "auth_required" });
    }

    if (userId && !preview) {
      const env = req.headers.get("x-payments-env") === "sandbox" ? "sandbox" : "live";
      const { data: ent, error } = await admin.rpc("get_entitlements", { _user_id: userId, _env: env });
      if (error) return json(500, { error: "Could not check your plan." });
      const limit = ent?.analyses_limit as number | null;
      const used = (ent?.analyses_used as number) ?? 0;
      if (limit !== null && limit !== undefined && used >= limit) {
        return json(402, {
          error: `You've used all ${limit} analyses included in your ${ent.plan_name} plan this period. Upgrade on the Pricing page for more.`,
          code: "limit_reached",
        });
      }
    }

    const res = await handler(req);
    if (res.ok && userId) {
      await admin.from("usage_events").insert({ user_id: userId, kind: "analysis", feature });
    }
    return res;
  };
}
