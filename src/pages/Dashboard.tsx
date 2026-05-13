import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Brain, FileDown, FolderOpen, Save, Upload, Eye, HeartPulse, Lightbulb, LayoutDashboard, BookOpen, TrendingUp, Moon, Sun, Sparkles, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import FileUpload from "@/components/dashboard/FileUpload";
import PromptBar from "@/components/dashboard/PromptBar";
import ChatPanel, { type ChatMessage } from "@/components/dashboard/ChatPanel";
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
import PredictionInsightsPanel from "@/components/dashboard/PredictionInsightsPanel";
import type { ParsedData } from "@/lib/data-processing";
import type { SheetInfo } from "@/lib/data-processing";
import type { ChartConfig, ChartType } from "@/lib/chart-types";
import { interpretPrompt } from "@/lib/local-ai";
import { generateSummary } from "@/lib/summarize";
import { toast } from "sonner";
import { getProjects, saveProjects, type Project } from "@/pages/Projects";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

type Tab = "upload" | "preview" | "health" | "insights" | "dashboard" | "story" | "prediction" | "prediction-insights";

const tabs: { id: Tab; label: string; icon: React.ElementType; needsData: boolean }[] = [
  { id: "upload", label: "Upload", icon: Upload, needsData: false },
  { id: "preview", label: "Preview", icon: Eye, needsData: true },
  { id: "health", label: "Health Check", icon: HeartPulse, needsData: true },
  { id: "insights", label: "Insights", icon: Lightbulb, needsData: true },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, needsData: true },
  { id: "story", label: "Story", icon: BookOpen, needsData: true },
  { id: "prediction", label: "Prediction", icon: TrendingUp, needsData: true },
  { id: "prediction-insights", label: "Prediction Insights", icon: Sparkles, needsData: true },
];

const emptyStateSuggestions = [
  "Show me a bar chart of the top 10 values",
  "Compare trends over time",
  "Give me a summary of this data",
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [data, setData] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState("");
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [slicerFilters, setSlicerFilters] = useState<Record<string, Set<string>>>({});
  const [sheetSelectorOpen, setSheetSelectorOpen] = useState(false);
  const [excelSheets, setExcelSheets] = useState<SheetInfo[]>([]);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cognilytix_dark") === "true";
    }
    return false;
  });
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);
  const [pendingChartType, setPendingChartType] = useState<ChartType | null>(null);

  // Dark mode effect
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("cognilytix_dark", String(darkMode));
  }, [darkMode]);

  // Restore saved project on mount (fix: was useState, now useEffect)
  useEffect(() => {
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
  }, [searchParams]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveProject();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const handleDataLoaded = useCallback((parsed: ParsedData, name: string) => {
    setData(parsed);
    setFileName(name);
    setCharts([]);
    setSummaryText("");
    setAiResponse("");
    setChatMessages([]);
    setSlicerFilters({});
    setActiveTab("preview");
  }, []);

  const handleReset = useCallback(() => {
    setData(null);
    setFileName("");
    setCharts([]);
    setSummaryText("");
    setAiResponse("");
    setChatMessages([]);
    setSlicerFilters({});
    setExcelSheets([]);
    setExcelFile(null);
    setActiveTab("upload");
    toast.success("Cleared current data — upload a new file.");
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

      const userMsg: ChatMessage = { role: "user", content: prompt };
      setChatMessages(prev => [...prev, userMsg]);

      try {
        const allMessages = [...chatMessages, userMsg].map(m => ({
          role: m.role,
          content: m.content,
        }));

        const { data: aiData, error } = await supabase.functions.invoke("ai-chat", {
          body: { messages: allMessages, context: getDataContext() },
        });

        if (error) throw error;

        const responseText = aiData?.response || "Sorry, I couldn't process that. Please try again.";

        setChatMessages(prev => [...prev, { role: "assistant", content: responseText }]);

        const visualMatch = responseText.match(/\[CREATE_VISUAL\]\s*(.+)/s);
        if (visualMatch) {
          const visualDesc = visualMatch[1].trim();
          try {
            const config = interpretPrompt(visualDesc, data.columns, data.rows);
            setCharts(prev => [config, ...prev]);
            toast.success(`Created: ${config.title}`);
          } catch {
            // Visual creation failed silently
          }
        }

        setAiResponse(responseText.replace(/\[CREATE_VISUAL\].*$/s, "").trim());
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to get AI response";
        setChatMessages(prev => [...prev, { role: "assistant", content: `Sorry, something went wrong: ${errorMsg}` }]);
        toast.error("AI response failed. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    },
    [data, chatMessages, getDataContext]
  );

  const handleVisualPick = useCallback(
    (type: ChartType) => {
      if (!data) return;
      // Instead of auto-creating, prefill the AxisBuilder so the user can
      // pick X / Y columns first. AxisBuilder handles the scroll.
      setPendingChartType(type);
      toast.info("Pick X and Y columns in the Axis Builder below.");
    },
    [data]
  );

  const removeChart = useCallback((id: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleTitleChange = useCallback((id: string, newTitle: string) => {
    setCharts(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
  }, []);

  const handleAxisCreate = useCallback(
    (xKey: string, yKeys: string[], chartType: ChartType) => {
      if (!data) return;
      try {
        const agg = (rows: Record<string, unknown>[], gk: string, vk: string) => {
          const map = new Map<string, number>();
          for (const row of rows) {
            const key = String(row[gk] ?? "Unknown");
            map.set(key, (map.get(key) || 0) + (Number(row[vk]) || 0));
          }
          return Array.from(map.entries()).map(([k, v]) => ({ [gk]: k, [vk]: Math.round(v * 100) / 100 }));
        };

        const stringCols = data.columns.filter(c => c.type === "string" || c.type === "date").map(c => c.name);
        const isCategory = stringCols.includes(xKey);
        let chartData: Record<string, unknown>[];

        if (isCategory && yKeys.length === 1) {
          chartData = agg(data.rows, xKey, yKeys[0]);
        } else if (isCategory && yKeys.length > 1) {
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

  // Memoize filtered data
  const filteredData = useMemo(() => {
    if (!data || Object.keys(slicerFilters).length === 0) return null;
    return data.rows.filter(row =>
      Object.entries(slicerFilters).every(([key, values]) => values.has(String(row[key] ?? "")))
    );
  }, [data, slicerFilters]);

  const exportDashboardPDF = async () => {
    const chartEls = document.querySelectorAll("#chart-grid > div");
    const summaryEl = document.querySelector("#summary-panel");
    if (chartEls.length === 0 && !summaryEl) return;
    setPdfProgress("Preparing export…");
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

      // Parallel canvas rendering
      const total = chartEls.length;
      setPdfProgress(`Rendering ${total} charts…`);
      const canvasPromises = Array.from(chartEls).map((el) => {
        const htmlEl = el as HTMLElement;
        const origPadding = htmlEl.style.padding;
        htmlEl.style.padding = "12px";
        const p = html2canvas(htmlEl, { backgroundColor: "#ffffff", scale: 4, useCORS: true, logging: false, width: htmlEl.scrollWidth + 24, height: htmlEl.scrollHeight + 24 })
          .then(canvas => {
            htmlEl.style.padding = origPadding;
            return canvas.toDataURL("image/png", 1.0);
          });
        return p;
      });
      const images = await Promise.all(canvasPromises);

      for (let i = 0; i < images.length; i++) {
        const posInPage = i % perPage;
        if (i > 0 && posInPage === 0) pdf.addPage();
        const col = posInPage % cols;
        const row = Math.floor(posInPage / cols);
        pdf.addImage(images[i], "PNG", margin + col * (cellW + gap), margin + row * (cellH + gap), cellW, cellH);
      }

      if (summaryEl) {
        setPdfProgress("Rendering summary…");
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
    } finally {
      setPdfProgress(null);
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

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCharts(prev => {
      const oldIdx = prev.findIndex(c => c.id === active.id);
      const newIdx = prev.findIndex(c => c.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
  }, []);

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
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDarkMode(!darkMode)} title="Toggle dark mode">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
              <FolderOpen className="h-4 w-4 mr-1" /> Projects
            </Button>
            {charts.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportDashboardPDF} disabled={!!pdfProgress}>
                <FileDown className="h-4 w-4 mr-1" /> {pdfProgress || "Export PDF"}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/auth"); }} title={user?.email ?? "Sign out"}>
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
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
              onReset={handleReset}
            />
          </div>
        )}

        {/* HEALTH CHECK TAB */}
        {activeTab === "health" && data && (
          <div className="max-w-5xl mx-auto p-6">
            <DataHealthCheck data={data} />
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
                <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none">
                  <ReactMarkdown>{aiResponse}</ReactMarkdown>
                </div>
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
              <ChatPanel messages={chatMessages} isLoading={isProcessing} />
            </div>

            {/* Visual Picker */}
            <VisualPicker onSelect={handleVisualPick} />

            {/* Axis Builder */}
            <AxisBuilder
              columns={data.columns}
              onCreateChart={handleAxisCreate}
              presetType={pendingChartType}
              onPresetConsumed={() => setPendingChartType(null)}
            />

            {/* Summary */}
            {summaryText && (
              <div id="summary-panel">
                <SummaryPanel summaryText={summaryText} />
              </div>
            )}

            {/* Charts grid with drag-to-reorder */}
            {charts.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={charts.map(c => c.id)} strategy={rectSortingStrategy}>
                  <div id="chart-grid" className="grid gap-4 md:grid-cols-2">
                    {charts.map(chart => (
                      <ChartCard
                        key={chart.id}
                        config={chart}
                        onRemove={removeChart}
                        onTitleChange={handleTitleChange}
                        filteredData={filteredData}
                        slicerFilters={slicerFilters}
                        onSlicerToggle={handleSlicerToggle}
                        sortable
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Loading */}
            {isProcessing && (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground">Analyzing your data...</p>
              </div>
            )}

            {/* Empty state with suggestions */}
            {charts.length === 0 && !isProcessing && (
              <div className="text-center py-12 rounded-lg border border-dashed border-border space-y-4">
                <Lightbulb className="h-8 w-8 text-primary mx-auto" />
                <div>
                  <p className="text-foreground font-medium">No charts yet — try one of these:</p>
                  <p className="text-muted-foreground text-xs mt-1">Click a suggestion or type your own prompt above.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                  {emptyStateSuggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => handlePrompt(s)}
                      className="rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
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
        {/* STORY TAB */}
        {activeTab === "story" && data && (
          <StoryDashboard data={data} charts={charts} summaryText={summaryText} />
        )}

        {/* PREDICTION TAB */}
        {activeTab === "prediction" && data && (
          <PredictionPanel data={data} />
        )}

        {/* PREDICTION INSIGHTS TAB */}
        {activeTab === "prediction-insights" && data && (
          <PredictionInsightsPanel data={data} />
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
