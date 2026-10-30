import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { gatewayFetch, type PaddleEnv } from "../_shared/paddle.ts";

const ALLOWED_PRICES = new Set([
  "starter_monthly", "starter_yearly",
  "professional_monthly", "professional_yearly",
  "business_monthly", "business_yearly",
]);
const ALLOWED_CURRENCIES = new Set(["INR", "USD", "EUR", "GBP"]);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: auth } = await admin.auth.getUser(token);
    const user = auth.user;
    if (!user) return json(401, { error: "Please sign in before subscribing." });

    const body = await req.json().catch(() => ({}));
    const priceId = String(body.priceId ?? "");
    const currency = String(body.currency ?? "INR").toUpperCase();
    const env: PaddleEnv = body.environment === "live" ? "live" : "sandbox";
    const fullName = String(body.fullName ?? "").trim().slice(0, 120);
    const company = String(body.company ?? "").trim().slice(0, 120);
    const taxId = String(body.taxId ?? "").trim().slice(0, 40);
    const country = String(body.country ?? "").trim().toUpperCase().slice(0, 2);
    if (!ALLOWED_PRICES.has(priceId)) return json(400, { error: "Unknown plan." });
    if (!ALLOWED_CURRENCIES.has(currency)) return json(400, { error: "Unsupported currency." });
    if (fullName.length < 2) return json(400, { error: "Please enter your full name." });
    if (!/^[A-Z]{2}$/.test(country)) return json(400, { error: "Please choose your country." });

    const priceRes = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(priceId)}`);
    const priceData = await priceRes.json();
    const paddlePriceId = priceData?.data?.[0]?.id;
    if (!priceRes.ok || !paddlePriceId) return json(502, { error: "Plan price not found.", details: priceData });

    // Find or create the customer so checkout opens with their details filled in.
    const email = user.email!;
    const findRes = await gatewayFetch(env, `/customers?email=${encodeURIComponent(email)}`);
    const found = await findRes.json();
    let customerId: string | undefined = found?.data?.[0]?.id;
    if (!customerId) {
      const c = await gatewayFetch(env, "/customers", { method: "POST", body: JSON.stringify({ email, name: fullName }) });
      const cj = await c.json();
      if (!c.ok) return json(c.status, { error: "Could not save your details.", details: cj });
      customerId = cj.data.id;
    } else {
      await gatewayFetch(env, `/customers/${customerId}`, { method: "PATCH", body: JSON.stringify({ name: fullName }) });
    }

    const txBody: Record<string, unknown> = {
      items: [{ price_id: paddlePriceId, quantity: 1 }],
      customer_id: customerId,
      currency_code: currency,
      collection_mode: "automatic",
      custom_data: { userId: user.id, company: company || null, taxId: taxId || null },
    };
    const txRes = await gatewayFetch(env, "/transactions", { method: "POST", body: JSON.stringify(txBody) });
    const tx = await txRes.json();
    if (!txRes.ok) {
      console.error("Transaction create failed", txRes.status, JSON.stringify(tx));
      const detail = tx?.error?.detail ?? "Could not start checkout.";
      return json(txRes.status, { error: detail, code: tx?.error?.code });
    }
    return json(200, { transactionId: tx.data.id, customerId });
  } catch (e) {
    console.error(e);
    return json(500, { error: e instanceof Error ? e.message : "Checkout failed" });
  }
});
