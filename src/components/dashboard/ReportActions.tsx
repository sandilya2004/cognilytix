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
import { reportStore, withPanelsVisible } from "@/lib/report-store";

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
    ? generateSummary(props.charts, props.data).split(/\n+/).map(stripMd).filter(Boolean).slice(0, 12)
    : [];
  const pi = reportStore.predictionInsights;
  return {
    title: props.title || "Cognilytix Report",
    fileName: props.fileName,
    data: props.data,
    charts: props.charts,
    insights,
    story: reportStore.story ? stripMd(reportStore.story) : undefined,
    predictions: reportStore.predictions ?? [],
    predictionAI: reportStore.predictionAI ? stripMd(reportStore.predictionAI) : undefined,
    predictionInsights: pi ? [...pi.trends, ...pi.growth.map((s) => `Opportunity: ${s}`)] : [],
    problems: pi ? [...pi.risks] : [],
    recommendations: pi ? [...pi.actions] : [],
  };
}

function stripMd(s: string): string {
  return s.replace(/\*\*|__|`/g, "").replace(/^#+\s*/gm, "").replace(/^\s*[-*]\s+/gm, "• ").trim();
}

function localSummary(p: ReportPayload): string {
  const d = p.data;
  if (!d) return "";
  const num = d.columns.filter((c) => c.type === "number").map((c) => c.name);
  const cat = d.columns.filter((c) => c.type === "string").map((c) => c.name);
  const parts = [
    `This report analyses ${d.rows.length.toLocaleString()} records from ${p.fileName || "the uploaded dataset"} across ${d.columns.length} fields, including ${num.length} numeric measures${num.length ? ` (${num.slice(0, 4).join(", ")})` : ""} and ${cat.length} categories${cat.length ? ` (${cat.slice(0, 4).join(", ")})` : ""}.`,
  ];
  if (p.insights?.length) parts.push(`Key observations: ${p.insights.slice(0, 3).join(" ")}`);
  if (p.predictions?.length) parts.push(`Looking ahead, ${p.predictions.slice(0, 2).join(" ")}`);
  return parts.join("\n\n");
}

/** Builds the complete payload: AI summary + every tab's generated content. */
async function buildFullPayload(props: Props): Promise<ReportPayload> {
  const base = buildBasePayload(props);
  try {
    const ai = await fetchExecutiveSummary(base);
    return {
      ...base,
      executiveSummary: ai.executiveSummary || localSummary(base),
      insights: [...(ai.keyFindings ?? []), ...(base.insights ?? [])].slice(0, 14),
      opportunities: ai.growthOpportunities ?? [],
      problems: [...(ai.riskAreas ?? []), ...(base.problems ?? [])],
      recommendations: [...(ai.recommendations ?? []), ...(base.recommendations ?? [])],
      predictionInsights: [...(ai.predictionInsights ?? []), ...(base.predictionInsights ?? [])],
    };
  } catch {
    return { ...base, executiveSummary: localSummary(base) };
  }
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

  const run = async (kind: "pdf" | "ppt" | "both", setL: (v: boolean) => void) => {
    if (!props.data) { toast.error("Upload data first."); return; }
    setL(true);
    const t = toast.loading("Building your report with charts, insights & predictions…");
    try {
      const payload = await buildFullPayload(props);
      await withPanelsVisible(async () => {
        if (kind !== "ppt") await downloadExecutivePDF(payload);
        if (kind !== "pdf") await downloadExecutivePPTX(payload);
      });
      toast.success(kind === "both" ? "Executive report ready (PDF + PPT)" : kind === "pdf" ? "PDF downloaded" : "PowerPoint downloaded", { id: t });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Export failed: ${msg}`, { id: t });
    } finally {
      setL(false);
    }
  };

  const exportPDF = () => run("pdf", setLoadingPdf);
  const exportPPT = () => run("ppt", setLoadingPpt);
  const generateExecutiveReport = () => run("both", setLoadingExec);

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