import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BarChart3, ArrowLeft, FileDown, Presentation, FileText, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/dashboard/FileUpload";
import DataPreview from "@/components/dashboard/DataPreview";
import PromptBar from "@/components/dashboard/PromptBar";
import ChartCard from "@/components/dashboard/ChartCard";
import VisualPicker from "@/components/dashboard/VisualPicker";
import SummaryPanel from "@/components/dashboard/SummaryPanel";
import type { ParsedData } from "@/lib/data-processing";
import type { ChartConfig, ChartType } from "@/lib/chart-types";
import { interpretPrompt, createFromType } from "@/lib/local-ai";
import { generateSummary } from "@/lib/summarize";
import { exportToPPTX } from "@/lib/export-pptx";
import { toast } from "sonner";
import jsPDF from "jspdf";

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState("");
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryText, setSummaryText] = useState("");

  const handleDataLoaded = useCallback((parsed: ParsedData, name: string) => {
    setData(parsed);
    setFileName(name);
    setCharts([]);
    setSummaryText("");
  }, []);

  const handlePrompt = useCallback(
    async (prompt: string) => {
      if (!data) return;
      setIsProcessing(true);
      try {
        await new Promise((r) => setTimeout(r, 400));

        // Check for summary/insight requests
        const p = prompt.toLowerCase();
        if (p.includes("summar") || p.includes("insight") || p.includes("analysis") || p.includes("recommend") || p.includes("trend") && p.includes("detail")) {
          const summary = generateSummary(charts, data);
          setSummaryText(summary);
          toast.success("Summary generated!");
          setIsProcessing(false);
          return;
        }

        // Check for PPTX request
        if (p.includes("ppt") || p.includes("presentation") || p.includes("power point") || p.includes("powerpoint") || p.includes("slide")) {
          toast.info("Generating PowerPoint…");
          await exportToPPTX(charts, summaryText || generateSummary(charts, data));
          toast.success("PowerPoint exported!");
          setIsProcessing(false);
          return;
        }

        const config = interpretPrompt(prompt, data.columns, data.rows);
        setCharts((prev) => [config, ...prev]);
        toast.success(`Generated: ${config.title}`);
      } catch (err) {
        toast.error("Failed to interpret prompt. Try rephrasing.");
      } finally {
        setIsProcessing(false);
      }
    },
    [data, charts, summaryText]
  );

  const handleVisualPick = useCallback(
    (type: ChartType) => {
      if (!data) return;
      try {
        const config = createFromType(type, data.columns, data.rows);
        setCharts((prev) => [config, ...prev]);
        toast.success(`Generated: ${config.title}`);
      } catch {
        toast.error("Could not create this visualization with current data.");
      }
    },
    [data]
  );

  const removeChart = useCallback((id: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleGenerateSummary = () => {
    if (!data) return;
    const summary = generateSummary(charts, data);
    setSummaryText(summary);
    toast.success("Summary generated!");
  };

  const exportDashboardPDF = async () => {
    const chartEls = document.querySelectorAll("#chart-grid > div");
    if (chartEls.length === 0) return;
    toast.info("Generating PDF…");
    try {
      const { default: html2canvas } = await import("html2canvas");
      const pdf = new jsPDF({ orientation: "landscape" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = (pageW - margin * 3) / 2;
      const usableH = (pageH - margin * 3) / 2;
      let col = 0;
      let row = 0;

      for (let i = 0; i < chartEls.length; i++) {
        if (i > 0 && col === 0 && row === 0) {
          pdf.addPage();
        }

        const el = chartEls[i] as HTMLElement;
        const canvas = await html2canvas(el, {
          backgroundColor: "#ffffff",
          scale: 2,
          useCORS: true,
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");
        const imgRatio = canvas.width / canvas.height;
        let w = usableW;
        let h = w / imgRatio;
        if (h > usableH) { h = usableH; w = h * imgRatio; }

        const x = margin + col * (usableW + margin);
        const y = margin + row * (usableH + margin);
        pdf.addImage(imgData, "PNG", x, y, w, h);

        col++;
        if (col >= 2) { col = 0; row++; }
        if (row >= 2) { col = 0; row = 0; }
      }

      pdf.save("dashboard.pdf");
      toast.success("PDF exported with all visuals!");
    } catch {
      toast.error("PDF export failed. Try again.");
    }
  };

  const handleExportPPTX = async () => {
    toast.info("Generating PowerPoint…");
    try {
      await exportToPPTX(charts, summaryText || (data ? generateSummary(charts, data) : ""));
      toast.success("PowerPoint exported!");
    } catch {
      toast.error("PowerPoint export failed.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">DataLens</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
              <FolderOpen className="h-4 w-4 mr-1" />
              Projects
            </Button>
            {charts.length > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={handleGenerateSummary}>
                  <FileText className="h-4 w-4 mr-1" />
                  Summary
                </Button>
                <Button variant="ghost" size="sm" onClick={handleExportPPTX}>
                  <Presentation className="h-4 w-4 mr-1" />
                  PPTX
                </Button>
                <Button variant="outline" size="sm" onClick={exportDashboardPDF}>
                  <FileDown className="h-4 w-4 mr-1" />
                  Export PDF
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        <PromptBar onSubmit={handlePrompt} isLoading={isProcessing} disabled={!data} />

        {!data ? (
          <FileUpload onDataLoaded={handleDataLoaded} />
        ) : (
          <>
            <DataPreview data={data} fileName={fileName} />
            <VisualPicker onSelect={handleVisualPick} />
          </>
        )}

        {summaryText && <SummaryPanel summaryText={summaryText} />}

        {charts.length > 0 && (
          <div id="chart-grid" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {charts.map((chart) => (
              <ChartCard key={chart.id} config={chart} onRemove={removeChart} />
            ))}
          </div>
        )}

        {isProcessing && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4 space-y-4">
                <div className="h-4 w-32 shimmer rounded" />
                <div className="h-[200px] shimmer rounded" />
              </div>
            ))}
          </div>
        )}

        {data && charts.length === 0 && !isProcessing && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              Your visualizations will appear here. Try a prompt or click a visual type above.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
