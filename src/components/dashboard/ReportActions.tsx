import { useState } from "react";
import { FileDown, Presentation, Share2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ChartConfig } from "@/lib/chart-types";
import type { ParsedData } from "@/lib/data-processing";
import { downloadExecutivePDF, type ReportPayload } from "@/lib/export-pdf";
import { downloadExecutivePPTX } from "@/lib/export-pptx";
import { generateSummary } from "@/lib/summarize";

interface Props {
  title: string;
  fileName: string;
  data: ParsedData | null;
  charts: ChartConfig[];
  summaryText: string;
}

type AISummary = {
  executiveSummary?: string;
  keyFindings?: string[];
  growthOpportunities?: string[];
  riskAreas?: string[];
  recommendations?: string[];
  predictionInsights?: string[];
};

async function fetchExecutiveSummary(payload: ReportPayload): Promise<AISummary> {
  const body = {
    title: payload.title,
    fileName: payload.fileName,
    totalRows: payload.data?.rows.length ?? 0,
    columns: payload.data?.columns.map((c) => `${c.name}:${c.type}`) ?? [],
    sampleRows: payload.data?.rows.slice(0, 5) ?? [],
    kpis: {},
    insights: payload.insights ?? [],
  };
  const { data, error } = await supabase.functions.invoke("executive-summary", { body });
  if (error) throw error;
  return (data ?? {}) as AISummary;
}

function buildBasePayload(props: Props): ReportPayload {
  const insights = props.data && props.charts.length
    ? generateSummary(props.charts, props.data).split(/\n+/).filter(Boolean).slice(0, 12)
    : [];
  return {
    title: props.title || "Cognilytix Report",
    fileName: props.fileName,
    data: props.data,
    charts: props.charts,
    insights,
  };
}

export default function ReportActions(props: Props) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingPpt, setLoadingPpt] = useState(false);
  const [loadingExec, setLoadingExec] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Share form state
  const [permission, setPermission] = useState<"view" | "comment" | "edit">("view");
  const [expiresDays, setExpiresDays] = useState<string>("30");
  const [password, setPassword] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [creatingShare, setCreatingShare] = useState(false);

  const exportPDF = async () => {
    if (!props.data) { toast.error("Upload data first."); return; }
    setLoadingPdf(true);
    try {
      await downloadExecutivePDF(buildBasePayload(props));
      toast.success("PDF downloaded");
    } catch (e) {
      toast.error("PDF export failed");
    } finally {
      setLoadingPdf(false);
    }
  };

  const exportPPT = async () => {
    if (!props.data) { toast.error("Upload data first."); return; }
    setLoadingPpt(true);
    try {
      await downloadExecutivePPTX(buildBasePayload(props));
      toast.success("PowerPoint downloaded");
    } catch (e) {
      toast.error("PowerPoint export failed");
    } finally {
      setLoadingPpt(false);
    }
  };

  const generateExecutiveReport = async () => {
    if (!props.data) { toast.error("Upload data first."); return; }
    setLoadingExec(true);
    const t = toast.loading("Generating board-ready report…");
    try {
      const base = buildBasePayload(props);
      const ai = await fetchExecutiveSummary(base);
      const enriched: ReportPayload = {
        ...base,
        executiveSummary: ai.executiveSummary,
        insights: [
          ...(ai.keyFindings ?? []),
          ...(ai.growthOpportunities ?? []).map((s) => `Opportunity: ${s}`),
          ...(ai.riskAreas ?? []).map((s) => `Risk: ${s}`),
        ],
        predictions: ai.predictionInsights ?? [],
        recommendations: ai.recommendations ?? [],
      };
      toast.dismiss(t);
      toast.loading("Building PDF + PowerPoint…", { id: t });
      await downloadExecutivePDF(enriched);
      await downloadExecutivePPTX(enriched);
      toast.success("Executive report ready (PDF + PPT downloaded)", { id: t });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Could not generate report: ${msg}`, { id: t });
    } finally {
      setLoadingExec(false);
    }
  };

  const createShareLink = async () => {
    if (!props.data) { toast.error("Upload data first."); return; }
    setCreatingShare(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) { toast.error("Sign in required"); return; }

      // Hash password client-side with SubtleCrypto (SHA-256) to avoid plain text storage.
      let passwordHash: string | null = null;
      if (password.trim()) {
        const enc = new TextEncoder().encode(password.trim());
        const buf = await crypto.subtle.digest("SHA-256", enc);
        passwordHash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }

      const expires_at = expiresDays === "never" ? null
        : new Date(Date.now() + parseInt(expiresDays, 10) * 86400000).toISOString();

      // Snapshot lightweight — cap rows to avoid huge payloads.
      const snapshot = {
        fileName: props.fileName,
        columns: props.data.columns,
        rows: props.data.rows.slice(0, 5000),
        rowCount: props.data.rows.length,
        charts: props.charts,
        summaryText: props.summaryText,
      };

      const { data: inserted, error } = await supabase
        .from("shared_reports")
        .insert([{
          owner_id: userRes.user.id,
          title: props.title || "Cognilytix Report",
          snapshot: snapshot as unknown as Record<string, unknown>,
          permission,
          password_hash: passwordHash,
          expires_at,
        }] as never)
        .select("id")
        .single();

      if (error) throw error;
      const url = `${window.location.origin}/report/${inserted.id}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Share link created and copied!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast.error(`Share failed: ${msg}`);
    } finally {
      setCreatingShare(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button variant="outline" size="sm" onClick={exportPDF} disabled={loadingPdf || !props.data}>
          {loadingPdf ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
          Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={exportPPT} disabled={loadingPpt || !props.data}>
          {loadingPpt ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Presentation className="h-4 w-4 mr-1" />}
          Export PowerPoint
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} disabled={!props.data}>
          <Share2 className="h-4 w-4 mr-1" /> Share Report
        </Button>
        <Button variant="hero" size="sm" onClick={generateExecutiveReport} disabled={loadingExec || !props.data}>
          {loadingExec ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          Generate Executive Report
        </Button>
      </div>

      <Dialog open={shareOpen} onOpenChange={(v) => { setShareOpen(v); if (!v) setShareUrl(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share this report</DialogTitle>
            <DialogDescription>
              Anyone with the link can open the interactive dashboard. Set an expiry or password for extra control.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Permission</Label>
              <Select value={permission} onValueChange={(v) => setPermission(v as typeof permission)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View only</SelectItem>
                  <SelectItem value="comment">View &amp; comment (coming soon)</SelectItem>
                  <SelectItem value="edit">View &amp; edit (coming soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Expiry</Label>
              <Select value={expiresDays} onValueChange={setExpiresDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Password (optional)</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank for no password" />
            </div>
            {shareUrl && (
              <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">Share this link:</p>
                <code className="text-xs break-all">{shareUrl}</code>
                <Button size="sm" variant="outline" className="w-full" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Copied!"); }}>
                  Copy link
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>Close</Button>
            <Button onClick={createShareLink} disabled={creatingShare}>
              {creatingShare ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Share2 className="h-4 w-4 mr-1" />}
              Create link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}