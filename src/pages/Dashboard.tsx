import { useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Brain, FileDown, FileText, FolderOpen, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/dashboard/FileUpload";
import DataPreview from "@/components/dashboard/DataPreview";
import SpreadsheetEditor from "@/components/dashboard/SpreadsheetEditor";
import PromptBar from "@/components/dashboard/PromptBar";
import ChartCard from "@/components/dashboard/ChartCard";
import VisualPicker from "@/components/dashboard/VisualPicker";
import SummaryPanel from "@/components/dashboard/SummaryPanel";
import type { ParsedData } from "@/lib/data-processing";
import type { ChartConfig, ChartType } from "@/lib/chart-types";
import { interpretPrompt, createFromType } from "@/lib/local-ai";
import { generateSummary } from "@/lib/summarize";
import { toast } from "sonner";
import { getProjects, saveProjects, type Project } from "@/pages/Projects";

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState("");
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [slicerFilters, setSlicerFilters] = useState<Record<string, Set<string>>>({});

  // Restore saved project on mount
  useState(() => {
    const projectId = searchParams.get("project");
    if (!projectId) return;
    try {
      const saved = localStorage.getItem(`cognilytix_project_${projectId}`);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed.charts) setCharts(parsed.charts);
      if (parsed.summaryText) setSummaryText(parsed.summaryText);
      if (parsed.fileName) setFileName(parsed.fileName);
      if (parsed.data) setData(parsed.data);
    } catch { /* ignore */ }
  });

  const handleDataLoaded = useCallback((parsed: ParsedData, name: string) => {
    setData(parsed);
    setFileName(name);
    setCharts([]);
    setSummaryText("");
    setSlicerFilters({});
  }, []);

  const handleDataChange = useCallback((newData: ParsedData) => {
    setData(newData);
  }, []);

  const handlePrompt = useCallback(
    async (prompt: string) => {
      if (!data) return;
      setIsProcessing(true);
      try {
        await new Promise((r) => setTimeout(r, 400));

        const p = prompt.toLowerCase();
        if (p.includes("summar") || p.includes("insight") || p.includes("analysis") || p.includes("recommend") || (p.includes("trend") && p.includes("detail"))) {
          const summary = generateSummary(charts, data);
          setSummaryText(summary);
          toast.success("Summary generated!");
          setIsProcessing(false);
          return;
        }

        const config = interpretPrompt(prompt, data.columns, data.rows);
        setCharts((prev) => [config, ...prev]);
        toast.success(`Generated: ${config.title}`);
      } catch {
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

  const handleSlicerToggle = useCallback((columnKey: string, value: string) => {
    setSlicerFilters(prev => {
      const next = { ...prev };
      const set = new Set(next[columnKey] || []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      if (set.size === 0) delete next[columnKey];
      else next[columnKey] = set;
      return next;
    });
  }, []);

  // Compute filtered data for charts based on active slicer filters
  const getFilteredData = useCallback(() => {
    if (!data || Object.keys(slicerFilters).length === 0) return null;
    const filtered = data.rows.filter(row => {
      return Object.entries(slicerFilters).every(([key, values]) => {
        return values.has(String(row[key] ?? ""));
      });
    });
    return filtered;
  }, [data, slicerFilters]);

  const exportDashboardPDF = async () => {
    const chartEls = document.querySelectorAll("#chart-grid > div");
    const summaryEl = document.querySelector("#summary-panel");
    if (chartEls.length === 0 && !summaryEl) return;

    toast.info("Generating high-quality PDF…");
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const gap = 5;
      const cols = 2;
      const cellW = (pageW - margin * 2 - gap) / cols;
      const cellH = (pageH - margin * 2 - gap) / 2;

      // Collect all chart images at high resolution
      const images: { data: string; w: number; h: number }[] = [];
      for (let i = 0; i < chartEls.length; i++) {
        const el = chartEls[i] as HTMLElement;
        const canvas = await html2canvas(el, {
          backgroundColor: "#ffffff",
          scale: 3,
          useCORS: true,
          logging: false,
          windowWidth: el.scrollWidth,
          windowHeight: el.scrollHeight,
        });
        images.push({ data: canvas.toDataURL("image/png", 1.0), w: canvas.width, h: canvas.height });
      }

      // Place charts in 2x2 grid per page
      const perPage = 4;
      for (let i = 0; i < images.length; i++) {
        const posInPage = i % perPage;
        if (i > 0 && posInPage === 0) pdf.addPage();

        const col = posInPage % cols;
        const row = Math.floor(posInPage / cols);
        const cellX = margin + col * (cellW + gap);
        const cellY = margin + row * (cellH + gap);

        const img = images[i];
        const imgRatio = img.w / img.h;
        let w = cellW;
        let h = w / imgRatio;
        if (h > cellH) { h = cellH; w = h * imgRatio; }
        const x = cellX + (cellW - w) / 2;
        const y = cellY + (cellH - h) / 2;
        pdf.addImage(img.data, "PNG", x, y, w, h);
      }

      // Summary on its own page
      if (summaryEl) {
        pdf.addPage();
        const summaryCanvas = await html2canvas(summaryEl as HTMLElement, {
          backgroundColor: "#ffffff",
          scale: 3,
          useCORS: true,
          logging: false,
          width: (summaryEl as HTMLElement).scrollWidth,
        });
        const imgData = summaryCanvas.toDataURL("image/png", 1.0);
        const imgRatio = summaryCanvas.width / summaryCanvas.height;
        const usableW = pageW - margin * 2;
        const usableH = pageH - margin * 2;
        let w = usableW;
        let h = w / imgRatio;
        if (h > usableH) { h = usableH; w = h * imgRatio; }
        pdf.addImage(imgData, "PNG", margin + (usableW - w) / 2, margin, w, h);
      }

      pdf.save("cognilytix_dashboard.pdf");
      toast.success("PDF exported with all visuals & summary!");
    } catch {
      toast.error("PDF export failed. Try again.");
    }
  };

  const handleSaveProject = () => {
    if (!data) {
      toast.error("Upload data first before saving.");
      return;
    }
    const projectId = searchParams.get("project") || crypto.randomUUID();
    const folderId = searchParams.get("folder") || "";
    const num = parseInt(searchParams.get("num") || "0", 10);
    const projects = getProjects();
    const existing = projects.findIndex(p => p.id === projectId);

    const project: Project = {
      id: projectId,
      folderId,
      name: fileName.replace(/\.[^/.]+$/, "") || "Untitled Project",
      fileName,
      createdAt: existing >= 0 ? projects[existing].createdAt : new Date().toISOString(),
      chartCount: charts.length,
      projectNumber: existing >= 0 ? projects[existing].projectNumber : (num || projects.filter(p => p.folderId === folderId).length + 1),
    };

    if (existing >= 0) {
      projects[existing] = project;
    } else {
      projects.unshift(project);
    }
    saveProjects(projects);

    localStorage.setItem(`cognilytix_project_${projectId}`, JSON.stringify({
      charts,
      summaryText,
      fileName,
      data,
    }));

    toast.success("Project saved!");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Cognilytix AI</span>
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

        {summaryText && (
          <div id="summary-panel">
            <SummaryPanel summaryText={summaryText} />
          </div>
        )}

        {charts.length > 0 && (
          <div id="chart-grid" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {charts.map((chart) => (
              <ChartCard
                key={chart.id}
                config={chart}
                onRemove={removeChart}
                filteredData={getFilteredData()}
                slicerFilters={slicerFilters}
                onSlicerToggle={handleSlicerToggle}
              />
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

        {/* Save Project Button */}
        {data && (
          <div className="flex justify-center pt-4 pb-8">
            <Button variant="hero" size="lg" onClick={handleSaveProject}>
              <Save className="h-5 w-5 mr-2" />
              Save Project
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
