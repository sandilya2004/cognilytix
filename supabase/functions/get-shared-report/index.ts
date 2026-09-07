// Public endpoint: serves a shared report without exposing password hashes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!UUID_RE.test(id)) return json({ error: "Invalid report link" }, 400);
    if (password.length > 200) return json({ error: "Invalid password" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await admin
      .from("shared_reports")
      .select("id,title,permission,password_hash,expires_at,snapshot")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("shared_reports lookup failed:", error.message);
      return json({ error: "Report unavailable" }, 500);
    }
    if (!data) return json({ error: "not_found" }, 404);
    if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
      return json({ error: "not_found" }, 404);
    }

    const requiresPassword = Boolean(data.password_hash);
    if (requiresPassword) {
      if (!password) {
        return json({ requiresPassword: true, title: data.title });
      }
      const hashed = await sha256Hex(password);
      if (hashed !== data.password_hash) {
        return json({ requiresPassword: true, title: data.title, error: "invalid_password" }, 401);
      }
    }

    return json({
      requiresPassword: false,
      report: {
        id: data.id,
        title: data.title,
        permission: data.permission,
        snapshot: data.snapshot,
      },
    });
  } catch (e) {
    console.error("get-shared-report error:", e);
    return json({ error: "Report unavailable" }, 500);
  }
});
