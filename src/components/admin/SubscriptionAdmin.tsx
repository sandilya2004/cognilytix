import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";

interface Limit { plan_id: string; name: string; analyses_per_month: number | null; max_upload_mb: number; saved_dashboards: number | null; team_members: number }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Summary = { by_plan: Record<string, number>; by_status: Record<string, number>; past_due: number; overrides: number; recent_audit: any[] };

export default function SubscriptionAdmin() {
  const { toast } = useToast();
  const env = getPaddleEnvironment();
  const [preview, setPreview] = useState<boolean | null>(null);
  const [limits, setLimits] = useState<Limit[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("starter_plan");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [s, l, sum] = await Promise.all([
      supabase.from("app_settings").select("preview_mode").eq("id", true).maybeSingle(),
      supabase.from("plan_limits").select("*").order("sort_order"),
      supabase.rpc("admin_subscription_summary", { _env: env }),
    ]);
    setPreview(s.data?.preview_mode ?? true);
    setLimits((l.data as Limit[]) ?? []);
    setSummary(sum.data as unknown as Summary);
  }, [env]);
  useEffect(() => { load(); }, [load]);

  const togglePreview = async (v: boolean) => {
    const { error } = await supabase.from("app_settings").update({ preview_mode: v, updated_at: new Date().toISOString() }).eq("id", true);
    if (error) toast({ title: "Could not update", description: error.message, variant: "destructive" });
    else { setPreview(v); toast({ title: v ? "Preview mode on" : "Preview mode off", description: v ? "Everyone keeps full access." : "Plan limits now apply to AI analyses." }); }
  };

  const saveLimit = async (l: Limit) => {
    const { error } = await supabase.from("plan_limits").update({
      analyses_per_month: l.analyses_per_month, max_upload_mb: l.max_upload_mb, saved_dashboards: l.saved_dashboards, updated_at: new Date().toISOString(),
    }).eq("plan_id", l.plan_id);
    toast(error ? { title: "Save failed", description: error.message, variant: "destructive" } : { title: `${l.name} limits saved` });
  };

  const assign = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_plan", { _email: email, _plan_id: plan, _reason: reason });
    setBusy(false);
    if (error) { toast({ title: "Could not assign", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plan updated", description: `${email} recorded in the audit log.` });
    setEmail(""); setReason(""); load();
  };

  const num = (v: string) => (v === "" ? null : Math.max(0, parseInt(v, 10) || 0));

  if (preview === null) return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
  const totalActive = Object.values(summary?.by_plan ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Preview mode</h2>
          <p className="text-sm text-muted-foreground">When on, everyone keeps full access and plan limits are not enforced. Notify users before turning it off.</p>
        </div>
        <Switch checked={preview} onCheckedChange={togglePreview} aria-label="Preview mode" />
      </section>

      <section className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Subscribers ({env === "sandbox" ? "test" : "live"} payments)</h2>
        <div className="grid gap-3 sm:grid-cols-4 text-sm">
          <div><p className="text-muted-foreground">Active paid</p><p className="text-xl font-semibold">{totalActive}</p></div>
          {["starter_plan", "professional_plan", "business_plan"].map(p => (
            <div key={p}><p className="text-muted-foreground">{limits.find(l => l.plan_id === p)?.name}</p><p className="text-xl font-semibold">{summary?.by_plan?.[p] ?? 0}</p></div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          By status: {Object.entries(summary?.by_status ?? {}).map(([k, v]) => `${k} ${v}`).join(" · ") || "no subscriptions yet"} · Payment failures (past due): {summary?.past_due ?? 0} · Manual assignments: {summary?.overrides ?? 0}
        </p>
        <p className="text-xs text-muted-foreground">Revenue and invoices are in the Payments dashboard.</p>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Plan limits</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground"><th className="py-2">Plan</th><th>Analyses / month</th><th>Max upload MB</th><th>Saved dashboards</th><th /></tr></thead>
            <tbody>
              {limits.map((l, i) => (
                <tr key={l.plan_id} className="border-t border-border">
                  <td className="py-2 font-medium">{l.name}</td>
                  <td><Input className="h-8 w-24" value={l.analyses_per_month ?? ""} placeholder="∞" onChange={e => setLimits(ls => ls.map((x, j) => j === i ? { ...x, analyses_per_month: num(e.target.value) } : x))} /></td>
                  <td><Input className="h-8 w-24" value={l.max_upload_mb} onChange={e => setLimits(ls => ls.map((x, j) => j === i ? { ...x, max_upload_mb: num(e.target.value) ?? 0 } : x))} /></td>
                  <td><Input className="h-8 w-24" value={l.saved_dashboards ?? ""} placeholder="∞" onChange={e => setLimits(ls => ls.map((x, j) => j === i ? { ...x, saved_dashboards: num(e.target.value) } : x))} /></td>
                  <td><Button size="sm" variant="outline" onClick={() => saveLimit(l)}>Save</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Assign a plan manually</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1"><Label>User email</Label><Input value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="space-y-1"><Label>Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {limits.map(l => <SelectItem key={l.plan_id} value={l.plan_id}>{l.name}</SelectItem>)}
                <SelectItem value="none">Remove manual plan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Reason</Label><Input value={reason} onChange={e => setReason(e.target.value)} maxLength={300} /></div>
        </div>
        <Button onClick={assign} disabled={busy || !email || !reason}>Save assignment</Button>
        {!!summary?.recent_audit?.length && (
          <ul className="text-xs text-muted-foreground space-y-1 pt-2">
            {summary.recent_audit.map((a, i) => <li key={i}>{new Date(a.created_at).toLocaleString()} — {a.details?.email} → {a.details?.plan_id} ({a.details?.reason})</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
