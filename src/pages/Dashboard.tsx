import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, ArrowLeft, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/dashboard/FileUpload";
import DataPreview from "@/components/dashboard/DataPreview";
import PromptBar from "@/components/dashboard/PromptBar";
import ChartCard from "@/components/dashboard/ChartCard";
import type { ParsedData } from "@/lib/data-processing";
import type { ChartConfig } from "@/lib/chart-types";
import { interpretPrompt } from "@/lib/local-ai";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState("");
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDataLoaded = useCallback((parsed: ParsedData, name: string) => {
    setData(parsed);
    setFileName(name);
    setCharts([]);
  }, []);

  const handlePrompt = useCallback(
    async (prompt: string) => {
      if (!data) return;
      setIsProcessing(true);
      try {
        // Small delay to show loading state
        await new Promise((r) => setTimeout(r, 400));
        const config = interpretPrompt(prompt, data.columns, data.rows);
        setCharts((prev) => [config, ...prev]);
        toast.success(`Generated: ${config.title}`);
      } catch (err) {
        toast.error("Failed to interpret prompt. Try rephrasing.");
      } finally {
        setIsProcessing(false);
      }
    },
    [data]
  );

  const removeChart = useCallback((id: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const exportDashboardPDF = async () => {
    const el = document.getElementById("chart-grid");
    if (!el) return;
    toast.info("Generating PDF…");
    const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape" });
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save("dashboard.pdf");
    toast.success("PDF exported!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">DataLens</span>
          </div>
          {charts.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportDashboardPDF}>
              <FileDown className="h-4 w-4 mr-1" />
              Export PDF
            </Button>
          )}
        </div>
      </header>

      <main className="container py-8 space-y-6">
        {/* Prompt Bar */}
        <PromptBar onSubmit={handlePrompt} isLoading={isProcessing} disabled={!data} />

        {/* Upload / Preview */}
        {!data ? (
          <FileUpload onDataLoaded={handleDataLoaded} />
        ) : (
          <DataPreview data={data} fileName={fileName} />
        )}

        {/* Charts Grid */}
        {charts.length > 0 && (
          <div id="chart-grid" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {charts.map((chart) => (
              <ChartCard key={chart.id} config={chart} onRemove={removeChart} />
            ))}
          </div>
        )}

        {/* Shimmer loading placeholders */}
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

        {/* Empty state */}
        {data && charts.length === 0 && !isProcessing && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              Your visualizations will appear here. Try a prompt like{" "}
              <span className="text-primary font-medium">"Create a bar chart"</span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
