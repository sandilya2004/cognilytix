import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPaddleEnvironment, initializePaddle } from "@/lib/paddle";
import { CURRENCIES, formatInr, type BillingCycle, type Currency, type Plan } from "@/lib/plans";

const COUNTRIES: [string, string][] = [
  ["IN", "India"], ["US", "United States"], ["GB", "United Kingdom"], ["AE", "United Arab Emirates"],
  ["SG", "Singapore"], ["AU", "Australia"], ["CA", "Canada"], ["DE", "Germany"], ["FR", "France"],
  ["NL", "Netherlands"], ["IE", "Ireland"], ["ES", "Spain"], ["IT", "Italy"], ["SA", "Saudi Arabia"],
];

interface Props { plan: Plan | null; cycle: BillingCycle; onClose: () => void }

export function CheckoutDialog({ plan, cycle, onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [taxId, setTaxId] = useState("");
  const [country, setCountry] = useState("IN");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFullName((user?.user_metadata?.full_name as string) ?? "");
  }, [user]);

  if (!plan?.priceIds) return null;
  const price = cycle === "monthly" ? plan.monthlyInr! : plan.yearlyInr!;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) { toast({ title: "Please enter your full name", variant: "destructive" }); return; }
    setBusy(true);
    try {
      await initializePaddle();
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: plan.priceIds![cycle], currency, country, fullName, company, taxId, environment: getPaddleEnvironment() },
      });
      if (error || !data?.transactionId) {
        let msg = data?.error ?? "Could not start checkout.";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = (error as any)?.context;
        if (ctx?.json) { try { msg = (await ctx.json()).error ?? msg; } catch { /* keep message */ } }
        throw new Error(msg);
      }
      onClose();
      window.Paddle.Checkout.open({
        transactionId: data.transactionId,
        customer: { email: user?.email },
        settings: {
          displayMode: "overlay",
          variant: "one-page",
          allowLogout: false,
          successUrl: `${window.location.origin}/account/subscription?checkout=success`,
        },
      });
    } catch (err) {
      toast({ title: "Checkout unavailable", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!plan} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Subscribe to {plan.name}</DialogTitle>
          <DialogDescription>
            {formatInr(price)} {cycle === "monthly" ? "per month" : "per year"} including applicable GST or VAT. The tax breakdown and final total for your country are shown on the next step, before you pay.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="co-name">Full name</Label>
            <Input id="co-name" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={120} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="co-email">Email</Label>
            <Input id="co-email" value={user?.email ?? ""} disabled />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger aria-label="Country"><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.map(([c, n]) => <SelectItem key={c} value={c}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
                <SelectTrigger aria-label="Currency"><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="co-company">Company (optional)</Label>
            <Input id="co-company" value={company} onChange={e => setCompany(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="co-tax">GST / VAT number (optional)</Label>
            <Input id="co-tax" value={taxId} onChange={e => setTaxId(e.target.value)} maxLength={40} />
          </div>
          {currency !== "INR" && <p className="text-xs text-muted-foreground">The amount is converted from rupees to {currency} at checkout.</p>}
          <Button type="submit" variant="hero" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Continue to secure payment
          </Button>
          <p className="text-center text-xs text-muted-foreground">Card, Google Pay and other local methods where available. Payments are processed by Paddle.com, our merchant of record.</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
