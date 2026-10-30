import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Details = { client?: { name?: string; client_name?: string; redirect_uri?: string } | null; redirect_uri?: string; scope?: string; redirect_url?: string; redirect_to?: string };
type Result<T> = Promise<{ data: T | null; error: { message: string } | null }>;
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Result<Details>;
  approveAuthorization: (id: string) => Result<{ redirect_url?: string; redirect_to?: string }>;
  denyAuthorization: (id: string) => Result<{ redirect_url?: string; redirect_to?: string }>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const SCOPE_LABELS: Record<string, string> = { openid: "Confirm your identity", email: "Share your email address", profile: "Share your basic profile" };

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<Details | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("This connection link is missing its authorization ID.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate("/auth?next=" + encodeURIComponent(window.location.pathname + window.location.search), { replace: true });
        return;
      }
      setEmail(sess.session.user.email ?? "");
      try {
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error || !data) return setError(error?.message ?? "This request has expired or is invalid.");
        const immediate = data.redirect_url ?? data.redirect_to;
        if (immediate && !data.client) { window.location.href = immediate; return; }
        setDetails(data);
      } catch {
        if (active) setError("Could not reach the sign-in service. Please try again.");
      }
    })();
    return () => { active = false; };
  }, [authorizationId, navigate]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve ? await oauth().approveAuthorization(authorizationId) : await oauth().denyAuthorization(authorizationId);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (error || !target) { setBusy(false); return setError(error?.message ?? "No redirect was returned."); }
      window.location.href = target;
    } catch {
      setBusy(false);
      setError(approve ? "Approval failed. Please try again." : "Cancelling failed. Please try again.");
    }
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "An app";
  const redirect = details?.client?.redirect_uri ?? details?.redirect_uri;
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg space-y-5">
        {error ? (
          <>
            <h1 className="text-xl font-semibold">Can't complete this connection</h1>
            <p className="text-sm text-muted-foreground" role="alert">{error}</p>
            <Button variant="outline" onClick={() => navigate("/")}>Back to Cognilytix</Button>
          </>
        ) : !details ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading request…</div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-semibold">Connect {clientName} to Cognilytix AI</h1>
            </div>
            <p className="text-sm">{clientName} will be able to call this app's enabled tools as you{email ? ` (${email})` : ""}.</p>
            {redirect && <p className="text-xs text-muted-foreground break-all">Returns to: {redirect}</p>}
            {scopes.length > 0 && (
              <ul className="text-sm list-disc pl-5 space-y-1">
                {scopes.map((s) => <li key={s}>{SCOPE_LABELS[s] ?? `Additional permission requested: ${s}`}</li>)}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">This does not bypass this app's permissions or backend policies.</p>
            <div className="flex gap-3">
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>Approve</Button>
              <Button className="flex-1" variant="outline" disabled={busy} onClick={() => decide(false)}>Cancel connection</Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
