import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Brain, CheckCircle2, Download, FileText, FlaskConical, Lightbulb, Loader2, Moon, Sun, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AutoDashboard from "@/components/dashboard/AutoDashboard";
import DataPreview from "@/components/dashboard/DataPreview";
import DataHealthCheck from "@/components/dashboard/DataHealthCheck";
import { createRetailDemoReport, DEMO_FILE_NAME, DEMO_NOTICE, retailDemoCSV } from "@/lib/retail-demo";
import { toast } from "sonner";

export default function Demo() {
  const report = useMemo(() => createRetailDemoReport(), []);
  const [tab, setTab] = useState("dashboard");
  const [exporting, setExporting] = useState<"pdf" | "ppt" | null>(null);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark") || localStorage.getItem("cognilytix_dark") === "true");
  // Demo preferences remain ephemeral; never write project or account storage.
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  const data = report.data;
  if (!data) return null;

  const downloadCSV = () => {
    const url = URL.createObjectURL(new Blob([retailDemoCSV()], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = DEMO_FILE_NAME;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const exportReport = async (format: "pdf" | "ppt") => {
    if (exporting) return;
    setExporting(format);
    try {
      if (format === "pdf") {
        const { downloadExecutivePDF } = await import("@/lib/export-pdf");
        await downloadExecutivePDF(report);
      } else {
        const { downloadExecutivePPTX } = await import("@/lib/export-pptx");
        await downloadExecutivePPTX(report);
      }
      toast.success("Synthetic sample report downloaded");
    } catch {
      toast.error("Sample report export failed. Please try again.");
    } finally { setExporting(null); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-card" aria-label="Demo navigation">
        <div className="container flex flex-wrap items-center justify-between gap-3 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold"><Brain className="h-6 w-6 text-primary" /> Cognilytix AI</Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title="Toggle theme" onClick={() => setDark(value => !value)}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
            <Button variant="ghost" size="sm" asChild><Link to="/">Home</Link></Button>
            <Button variant="outline" size="sm" asChild><Link to="/pricing">Pricing & FAQ</Link></Button>
          </div>
        </div>
      </nav>
      <main className="container py-8 sm:py-10">
        <header className="mb-6 space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary"><FlaskConical className="h-4 w-4" /> PUBLIC DEMO · SYNTHETIC DATA</p>
          <h1 className="text-3xl font-bold">Retail analytics demonstration</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{DEMO_NOTICE} 72 generated records, January–June 2026. Sales and profit use illustrative currency units.</p>
          <p className="border-l-2 border-accent pl-3 text-sm text-muted-foreground">Demo filters and chart choices stay in this page only. No account, project save, sharing or live AI request is used.</p>
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-1" aria-label="Sample analytics views">
            {[
              ["dataset", "Sample dataset", Table2], ["health", "Data health", CheckCircle2],
              ["dashboard", "Dashboard", BarChart3], ["insights", "Sample insights", Lightbulb], ["report", "Report output", FileText],
            ].map(([value, label, Icon]) => {
              const TabIcon = Icon as typeof Table2;
              return <TabsTrigger key={String(value)} value={String(value)}><TabIcon className="mr-2 h-4 w-4" />{String(label)}</TabsTrigger>;
            })}
          </TabsList>
        </Tabs>

        <div hidden={tab !== "dataset"}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Synthetic sample dataset</h2>
            <Button variant="outline" size="sm" onClick={downloadCSV}><Download className="mr-2 h-4 w-4" /> Download synthetic CSV</Button>
          </div>
          <div className="min-w-0 overflow-hidden"><DataPreview data={data} fileName={DEMO_FILE_NAME} /></div>
        </div>
        <div hidden={tab !== "health"}>
          <h2 className="mb-3 text-xl font-semibold">Sample data health check</h2>
          <p className="mb-5 text-sm text-muted-foreground">One Region was intentionally left blank so you can see a real check on the synthetic records.</p>
          <DataHealthCheck data={data} />
        </div>
        {/* Keep the local dashboard mounted; show it during report export for chart capture. */}
        <div hidden={tab !== "dashboard" && tab !== "report"}>
          <AutoDashboard data={data} allowCustomCharts={false} />
        </div>
        <div hidden={tab !== "insights"} className="space-y-8">
          <header className="space-y-2"><h2 className="text-xl font-semibold">Sample retail insights</h2><p className="text-sm text-muted-foreground">Calculated locally from the full synthetic dataset; not a live AI response. Insights describe all 72 rows, independent of dashboard filters.</p></header>
          {[["Key findings", report.insights], ["Data quality & limitations", report.problems], ["Illustrative recommendations", report.recommendations]].map(([heading, items]) => (
            <section key={String(heading)} className="space-y-3 border-t border-border pt-5">
              <h3 className="font-semibold">{String(heading)}</h3>
              <ul className="list-disc space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">{(items as string[]).map(item => <li key={item}>{item}</li>)}</ul>
            </section>
          ))}
        </div>
        <section hidden={tab !== "report"} className="mt-8 space-y-5 border-t border-border pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Synthetic sample report output</h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={exporting !== null} onClick={() => exportReport("pdf")}>{exporting === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download sample PDF</Button>
              <Button variant="outline" disabled={exporting !== null} onClick={() => exportReport("ppt")}>{exporting === "ppt" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download sample PPT</Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Downloads use the existing report tools with synthetic content. Text summaries cover the full sample; captured charts reflect your current filters. No report is saved to an account.</p>
          <h3 className="font-semibold">Executive summary</h3>
          <p className="max-w-4xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{report.executiveSummary}</p>
          <h3 className="font-semibold">Sample data story</h3>
          <p className="max-w-4xl whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{report.story}</p>
        </section>
      </main>
      <footer className="container flex flex-wrap gap-5 border-t border-border py-6 text-xs text-muted-foreground"><span>Synthetic demo · Cognilytix AI</span><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></footer>
    </div>
  );
}