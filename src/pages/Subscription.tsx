import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPaddleEnvironment } from "@/lib/paddle";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

interface Entitlements {
  plan_id: string; plan_name: string; preview_mode: boolean; analyses_limit: number | null; analyses_used: number;
  max_upload_mb: number; saved_dashboards: number | null; team_members: number; period_start: string | null;
  period_end: string | null; status: string; cancel_at_period_end: boolean;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function Subscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [ent, setEnt] = useState<Entitlements | null>(null);
  const [opening, setOpening] = useState(false);
  const env = getPaddleEnvironment();

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("get_my_entitlements", { _env: env });
    setEnt(data as unknown as Entitlements);
  }, [env]);

  useEffect(() => { load(); }, [load]);

  // Webhook confirmation can take a few seconds after checkout.
  useEffect(() => {
    if (params.get("checkout") !== "success" || !user) return;
    toast({ title: "Payment received", description: "Your plan updates as soon as the payment is confirmed." });
    const ch = supabase.channel("subs-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    const t = setInterval(load, 4000);
    const stop = setTimeout(() => clearInterval(t), 40000);
    return () => { supabase.removeChannel(ch); clearInterval(t); clearTimeout(stop); };
  }, [params, user, load, toast]);

  const openPortal = async () => {
    setOpening(true);
    const { data, error } = await supabase.functions.invoke("customer-portal", { body: { environment: env } });
    setOpening(false);
    if (error || !data?.url) { toast({ title: "Could not open billing", description: "Please try again shortly.", variant: "destructive" }); return; }
    window.open(data.url, "_blank");
  };

  const paid = ent && ent.plan_id !== "free" && ent.status !== "none";
  const pct = ent?.analyses_limit ? Math.min(100, (ent.analyses_used / ent.analyses_limit) * 100) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <div className="container max-w-3xl py-10 space-y-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
        <h1 className="text-3xl font-bold">Subscription</h1>
        {!ent ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : (
          <>
            {ent.preview_mode && (
              <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">Preview mode is on: you keep full access while Cognilytix is in preview. Plan limits below take effect when preview ends, and you'll be told before then.</p>
            )}
            <section className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Current plan</p>
                  <p className="text-2xl font-semibold">{ent.plan_name}</p>
                  {paid && <p className="text-sm text-muted-foreground capitalize">Status: {ent.status.replace("_", " ")}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild><Link to="/pricing">{paid ? "Change plan" : "Upgrade"}</Link></Button>
                  {paid && <Button onClick={openPortal} disabled={opening}>{opening ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}Manage billing<ExternalLink className="ml-1 h-3 w-3" /></Button>}
                </div>
              </div>
              {paid && (
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div><p className="text-muted-foreground">Billing period</p><p>{fmt(ent.period_start)} – {fmt(ent.period_end)}</p></div>
                  <div><p className="text-muted-foreground">{ent.cancel_at_period_end || ent.status === "canceled" ? "Access ends" : "Next renewal"}</p><p>{fmt(ent.period_end)}</p></div>
                </div>
              )}
              {ent.status === "past_due" && <p className="text-sm text-destructive">Your last payment failed. Please update your payment method in Manage billing.</p>}
              {paid && <p className="text-xs text-muted-foreground">Manage billing lets you switch plans, cancel, update your card and download invoices and receipts. If you cancel, your plan stays active until the end of the paid period and your projects and reports are kept.</p>}
            </section>
            <section className="rounded-lg border border-border bg-card p-6 space-y-5">
              <h2 className="text-lg font-semibold">Usage this period</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span>Analyses used</span><span>{ent.analyses_used} of {ent.analyses_limit ?? "unlimited"} · {ent.analyses_limit === null ? "—" : Math.max(0, ent.analyses_limit - ent.analyses_used)} remaining</span></div>
                <Progress value={pct} />
                <p className="text-xs text-muted-foreground">Counts successful executive reports and prediction insights.</p>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div><p className="text-muted-foreground">Upload size limit</p><p className="font-medium">{ent.max_upload_mb} MB</p></div>
                <div><p className="text-muted-foreground">Saved dashboards</p><p className="font-medium">{ent.saved_dashboards ?? "Unlimited"} allowed</p></div>
                <div><p className="text-muted-foreground">Team members</p><p className="font-medium">1 of {ent.team_members}</p></div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
