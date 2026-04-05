import { useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Brain, FileDown, FolderOpen, Save, Upload, Eye, HeartPulse, Lightbulb, LayoutDashboard, BookOpen, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/dashboard/FileUpload";
import PromptBar from "@/components/dashboard/PromptBar";
import ChartCard from "@/components/dashboard/ChartCard";
import VisualPicker from "@/components/dashboard/VisualPicker";
import SummaryPanel from "@/components/dashboard/SummaryPanel";
import InsightsPanel from "@/components/dashboard/InsightsPanel";
import DataPanel from "@/components/dashboard/DataPanel";
import DataHealthCheck from "@/components/dashboard/DataHealthCheck";
import SheetSelectorDialog from "@/components/dashboard/SheetSelectorDialog";
import AxisBuilder from "@/components/dashboard/AxisBuilder";
import StoryDashboard from "@/components/dashboard/StoryDashboard";
import PredictionPanel from "@/components/dashboard/PredictionPanel";
import type { ParsedData } from "@/lib/data-processing";
import type { SheetInfo } from "@/lib/data-processing";
import type { ChartConfig, ChartType } from "@/lib/chart-types";
import { interpretPrompt, createFromType } from "@/lib/local-ai";
import { generateSummary } from "@/lib/summarize";
import { toast } from "sonner";
import { getProjects, saveProjects, type Project } from "@/pages/Projects";
import { supabase } from "@/integrations/supabase/client";

type Tab = "upload" | "preview" | "health" | "insights" | "dashboard" | "story" | "prediction";

const tabs: { id: Tab; label: string; icon: React.ElementType; needsData: boolean }[] = [
  { id: "upload", label: "Upload", icon: Upload, needsData: false },
  { id: "preview", label: "Preview", icon: Eye, needsData: true },
  { id: "health", label: "Health Check", icon: HeartPulse, needsData: true },
  { id: "insights", label: "Insights", icon: Lightbulb, needsData: true },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, needsData: true },
  { id: "story", label: "Story", icon: BookOpen, needsData: true },
  { id: "prediction", label: "Prediction", icon: TrendingUp, needsData: true },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [data, setData] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState("");
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [slicerFilters, setSlicerFilters] = useState<Record<string, Set<string>>>({});
  const [sheetSelectorOpen, setSheetSelectorOpen] = useState(false);
  const [excelSheets, setExcelSheets] = useState<SheetInfo[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);

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
      if (parsed.data) { setData(parsed.data); setActiveTab("dashboard"); }
    } catch { /* ignore */ }
  });

  const handleDataLoaded = useCallback((parsed: ParsedData, name: string) => {
    setData(parsed);
    setFileName(name);
    setCharts([]);
    setSummaryText("");
    setAiResponse("");
    setSlicerFilters({});
    setActiveTab("preview");
  }, []);

  const handleDataChange = useCallback((newData: ParsedData) => {
    setData(newData);
  }, []);

  const getDataContext = useCallback(() => {
    if (!data) return "";
    const colInfo = data.columns.map(c => `${c.name} (${c.type})`).join(", ");
    const sampleRows = data.rows.slice(0, 5).map(r => JSON.stringify(r)).join("\n");
    return `Columns: ${colInfo}\nTotal Rows: ${data.rows.length}\nSample Data:\n${sampleRows}`;
  }, [data]);

  const handlePrompt = useCallback(
    async (prompt: string) => {
      if (!data) return;
      setIsProcessing(true);
      try {
        // Try to generate a chart from the prompt
        const p = prompt.toLowerCase();
        if (p.includes("summar") || p.includes("insight") || p.includes("analysis") || p.includes("recommend")) {
          const summary = generateSummary(charts, data);
          setSummaryText(summary);
          toast.success("Summary generated!");
        } else {
          const config = interpretPrompt(prompt, data.columns, data.rows);
          setCharts((prev) => [config, ...prev]);
          toast.success(`Generated: ${config.title}`);
        }

        // Also get AI response from Gemini
        try {
          const { data: aiData, error } = await supabase.functions.invoke("ai-chat", {
            body: { prompt, context: getDataContext() },
          });
          if (!error && aiData?.response) {
            setAiResponse(aiData.response);
          }
        } catch {
          // AI response is optional, don't block
        }
      } catch {
        toast.error("Failed to interpret prompt. Try rephrasing.");
      } finally {
        setIsProcessing(false);
      }
    },
    [data, charts, getDataContext]
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

  const handleAxisCreate = useCallback(
    (xKey: string, yKeys: string[], chartType: ChartType) => {
      if (!data) return;
      try {
        const { generateId } = require("@/lib/chart-types");
        const { aggregateData: localAgg } = (() => {
          // inline aggregate
          const agg = (rows: Record<string, unknown>[], gk: string, vk: string) => {
            const map = new Map<string, number>();
            for (const row of rows) {
              const key = String(row[gk] ?? "Unknown");
              map.set(key, (map.get(key) || 0) + (Number(row[vk]) || 0));
            }
            return Array.from(map.entries()).map(([k, v]) => ({ [gk]: k, [vk]: Math.round(v * 100) / 100 }));
          };
          return { aggregateData: agg };
        })();

        const stringCols = data.columns.filter(c => c.type === "string" || c.type === "date").map(c => c.name);
        const isCategory = stringCols.includes(xKey);
        let chartData: Record<string, unknown>[];

        if (isCategory && yKeys.length === 1) {
          chartData = localAgg(data.rows, xKey, yKeys[0]);
        } else if (isCategory && yKeys.length > 1) {
          // Multi-key aggregation
          const map = new Map<string, Record<string, number>>();
          for (const row of data.rows) {
            const key = String(row[xKey] ?? "Unknown");
            if (!map.has(key)) map.set(key, {});
            const entry = map.get(key)!;
            for (const yk of yKeys) {
              entry[yk] = (entry[yk] || 0) + (Number(row[yk]) || 0);
            }
          }
          chartData = Array.from(map.entries()).map(([k, v]) => ({ [xKey]: k, ...v }));
        } else {
          chartData = data.rows.slice(0, 100);
        }

        if (chartType === "pie") chartData = chartData.slice(0, 10);

        const id = Math.random().toString(36).slice(2, 10);
        const config: ChartConfig = {
          id,
          type: chartType,
          title: `${yKeys.join(", ")} by ${xKey}`,
          xKey,
          yKey: yKeys[0],
          yKeys: yKeys.length > 1 ? yKeys : undefined,
          labelKey: xKey,
          valueKey: yKeys[0],
          data: chartData,
        };
        setCharts(prev => [config, ...prev]);
        toast.success(`Created: ${config.title}`);
      } catch {
        toast.error("Could not create chart with selected columns.");
      }
    },
    [data]
  );

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Cognilytix AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
              <FolderOpen className="h-4 w-4 mr-1" /> Projects
            </Button>
            {charts.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportDashboardPDF}>
                <FileDown className="h-4 w-4 mr-1" /> Export PDF
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-border bg-card/50 px-4">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const disabled = tab.needsData && !data;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                disabled={disabled}
                onClick={() => !disabled && setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : disabled
                    ? "border-transparent text-muted-foreground/40 cursor-not-allowed"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto">
        {/* UPLOAD TAB */}
        {activeTab === "upload" && (
          <div className="max-w-3xl mx-auto p-6">
            <FileUpload
              onDataLoaded={handleDataLoaded}
              onSheetsDetected={(sheets, file, name) => {
                setExcelSheets(sheets);
                setExcelFile(file);
                setFileName(name);
                setSheetSelectorOpen(true);
              }}
            />
          </div>
        )}

        {/* PREVIEW TAB */}
        {activeTab === "preview" && data && (
          <div className="max-w-5xl mx-auto p-6 space-y-4">
            <DataPanel
              data={data}
              fileName={fileName}
              onUploadClick={() => setActiveTab("upload")}
              showSheetSelector={excelSheets.length > 0}
              onSheetSelectorClick={() => setSheetSelectorOpen(true)}
            />
          </div>
        )}

        {/* HEALTH CHECK TAB */}
        {activeTab === "health" && data && (
          <div className="max-w-4xl mx-auto p-6">
            <DataHealthCheck data={data} onDataFixed={handleDataChange} />
          </div>
        )}

        {/* INSIGHTS TAB */}
        {activeTab === "insights" && data && (
          <div className="max-w-4xl mx-auto p-6 space-y-4">
            <InsightsPanel data={data} />
            {aiResponse && (
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  AI Analysis
                </h3>
                <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: aiResponse
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\n/g, "<br/>"),
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && data && (
          <div className="p-4 space-y-4">
            {/* Prompt bar */}
            <div className="max-w-4xl mx-auto">
              <PromptBar onSubmit={handlePrompt} isLoading={isProcessing} disabled={!data} />
            </div>

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

            {/* Summary button */}
            {charts.length > 0 && (
              <div className="flex justify-center gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={handleGenerateSummary}>
                  <Lightbulb className="h-4 w-4 mr-1" /> Generate Summary
                </Button>
              </div>
            )}

            {/* Save */}
            <div className="flex justify-center pt-2 pb-6">
              <Button variant="hero" size="lg" onClick={handleSaveProject}>
                <Save className="h-5 w-5 mr-2" /> Save Project
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Sheet Selector Dialog */}
      <SheetSelectorDialog
        open={sheetSelectorOpen}
        onOpenChange={setSheetSelectorOpen}
        sheets={excelSheets}
        file={excelFile}
        fileName={fileName}
        onSheetLoaded={(parsedData, name) => {
          setData(parsedData);
          setFileName(name);
          setCharts([]);
          setSummaryText("");
          setSlicerFilters({});
          setActiveTab("preview");
        }}
      />
    </div>
  );
}
