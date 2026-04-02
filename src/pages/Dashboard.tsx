import { useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Brain, FileDown, FileText, FolderOpen, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/dashboard/FileUpload";
import PromptBar from "@/components/dashboard/PromptBar";
import ChartCard from "@/components/dashboard/ChartCard";
import VisualPicker from "@/components/dashboard/VisualPicker";
import SummaryPanel from "@/components/dashboard/SummaryPanel";
import InsightsPanel from "@/components/dashboard/InsightsPanel";
import SuggestionsPanel from "@/components/dashboard/SuggestionsPanel";
import DataPanel from "@/components/dashboard/DataPanel";
import DataHealthCheck from "@/components/dashboard/DataHealthCheck";
import SheetSelectorDialog from "@/components/dashboard/SheetSelectorDialog";
import type { ParsedData } from "@/lib/data-processing";
import type { SheetInfo } from "@/lib/data-processing";
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
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const uploadRef = useRef<HTMLDivElement>(null);

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
    setShowSheetSelector(name.includes(" — ") || /\.xlsx?$/i.test(name));
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
    [data, charts]
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

  const getFilteredData = useCallback(() => {
    if (!data || Object.keys(slicerFilters).length === 0) return null;
    return data.rows.filter(row =>
      Object.entries(slicerFilters).every(([key, values]) => values.has(String(row[key] ?? "")))
    );
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
      const margin = 10;
      const gap = 6;
      const cols = 2;
      const rows = 2;
      const cellW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
      const cellH = (pageH - margin * 2 - gap * (rows - 1)) / rows;
      const perPage = cols * rows;

      const images: string[] = [];
      for (let i = 0; i < chartEls.length; i++) {
        const el = chartEls[i] as HTMLElement;
        const origPadding = el.style.padding;
        el.style.padding = "12px";
        const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 4, useCORS: true, logging: false, width: el.scrollWidth + 24, height: el.scrollHeight + 24 });
        el.style.padding = origPadding;
        images.push(canvas.toDataURL("image/png", 1.0));
      }

      for (let i = 0; i < images.length; i++) {
        const posInPage = i % perPage;
        if (i > 0 && posInPage === 0) pdf.addPage();
        const col = posInPage % cols;
        const row = Math.floor(posInPage / cols);
        pdf.addImage(images[i], "PNG", margin + col * (cellW + gap), margin + row * (cellH + gap), cellW, cellH);
      }

      if (summaryEl) {
        pdf.addPage();
        const summaryCanvas = await html2canvas(summaryEl as HTMLElement, { backgroundColor: "#ffffff", scale: 4, useCORS: true, logging: false, width: (summaryEl as HTMLElement).scrollWidth + 20 });
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
      toast.success("PDF exported!");
    } catch {
      toast.error("PDF export failed.");
    }
  };

  const handleSaveProject = () => {
    if (!data) { toast.error("Upload data first."); return; }
    const projectId = searchParams.get("project") || crypto.randomUUID();
    const folderId = searchParams.get("folder") || "";
    const num = parseInt(searchParams.get("num") || "0", 10);
    const projects = getProjects();
    const existing = projects.findIndex(p => p.id === projectId);
    const project: Project = {
      id: projectId, folderId,
      name: fileName.replace(/\.[^/.]+$/, "") || "Untitled Project",
      fileName, createdAt: existing >= 0 ? projects[existing].createdAt : new Date().toISOString(),
      chartCount: charts.length,
      projectNumber: existing >= 0 ? projects[existing].projectNumber : (num || projects.filter(p => p.folderId === folderId).length + 1),
    };
    if (existing >= 0) projects[existing] = project;
    else projects.unshift(project);
    saveProjects(projects);
    localStorage.setItem(`cognilytix_project_${projectId}`, JSON.stringify({ charts, summaryText, fileName, data }));
    toast.success("Project saved!");
  };

  const scrollToUpload = () => uploadRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Cognilytix AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
              <FolderOpen className="h-4 w-4 mr-1" /> Projects
            </Button>
            {charts.length > 0 && (
              <>
                <Button variant="ghost" size="sm" onClick={handleGenerateSummary}>
                  <FileText className="h-4 w-4 mr-1" /> Summary
                </Button>
                <Button variant="outline" size="sm" onClick={exportDashboardPDF}>
                  <FileDown className="h-4 w-4 mr-1" /> Export PDF
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Prompt bar */}
      <div className="border-b border-border bg-card/50 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <PromptBar onSubmit={handlePrompt} isLoading={isProcessing} disabled={!data} />
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex h-[calc(100vh-7.5rem)]">
        {/* LEFT: Data panel */}
        <aside className="w-64 border-r border-border bg-card/30 p-3 overflow-y-auto shrink-0 hidden lg:block">
          <DataPanel
            data={data}
            fileName={fileName}
            onUploadClick={scrollToUpload}
            showSheetSelector={showSheetSelector}
            onSheetSelectorClick={() => {
              setData(null);
              setShowSheetSelector(false);
            }}
          />
        </aside>

        {/* CENTER: Main content */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {!data ? (
            <div ref={uploadRef}>
              <FileUpload onDataLoaded={handleDataLoaded} />
            </div>
          ) : (
            <>
              {/* Data Health Check */}
              <DataHealthCheck data={data} onDataFixed={handleDataChange} />

              {/* Insights auto-generated */}
              <InsightsPanel data={data} />

              {/* Visual Picker */}
              <VisualPicker onSelect={handleVisualPick} />


              {/* Summary */}
              {summaryText && (
                <div id="summary-panel">
                  <SummaryPanel summaryText={summaryText} />
                </div>
              )}

              {/* Charts grid */}
              {charts.length > 0 && (
                <div id="chart-grid" className="grid gap-4 md:grid-cols-2">
                  {charts.map(chart => (
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

              {/* Loading */}
              {isProcessing && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground">Analyzing your data...</p>
                </div>
              )}

              {/* Empty state */}
              {charts.length === 0 && !isProcessing && (
                <div className="text-center py-12 rounded-lg border border-dashed border-border">
                  <p className="text-muted-foreground text-sm">Your visualizations will appear here.</p>
                  <p className="text-muted-foreground text-xs mt-1">Try a prompt or click a visual type above.</p>
                </div>
              )}

              {/* Save */}
              <div className="flex justify-center pt-2 pb-6">
                <Button variant="hero" size="lg" onClick={handleSaveProject}>
                  <Save className="h-5 w-5 mr-2" /> Save Project
                </Button>
              </div>
            </>
          )}
        </main>

        {/* RIGHT: Suggestions */}
        <aside className="w-56 border-l border-border bg-card/30 p-3 overflow-y-auto shrink-0 hidden xl:block">
          <SuggestionsPanel data={data} onPrompt={handlePrompt} />
        </aside>
      </div>
    </div>
  );
}
