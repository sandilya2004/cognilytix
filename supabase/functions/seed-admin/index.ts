// Idempotent admin seeder. Safe to call repeatedly — does nothing if admin exists.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_DOMAIN = "admin.cognilytix.local";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const userId = Deno.env.get("SEED_ADMIN_USER_ID");
    const password = Deno.env.get("SEED_ADMIN_PASSWORD");
    if (!userId || !password) {
      return new Response(JSON.stringify({ error: "Seed secrets not set" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build internal email from "name@1234" -> "name_1234@admin.cognilytix.local"
    const sanitized = userId.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const email = `${sanitized}@${ADMIN_DOMAIN}`;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Check if user exists
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email === email);

    if (found) {
      // Update password + ensure admin role
      const { error: updErr } = await admin.auth.admin.updateUserById(found.id, {
        password,
        email_confirm: true,
      });
      if (updErr) throw updErr;
      await admin.from("user_roles").upsert(
        { user_id: found.id, role: "admin" },
        { onConflict: "user_id,role" },
      );
      return new Response(JSON.stringify({ ok: true, status: "updated", email, login_id: userId, user_id: found.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: userId, is_admin: true },
    });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, status: "created", email, login_id: userId, user_id: data.user?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
