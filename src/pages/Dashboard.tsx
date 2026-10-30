import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Brain, FolderOpen, Save, Upload, Eye, HeartPulse, Lightbulb, LayoutDashboard, BookOpen, TrendingUp, Moon, Sun, Sparkles, LogOut, Wand2, FileText, Home, Menu, ChevronDown, ChevronRight, PanelRightClose, PanelRightOpen, Database, Layers, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import ReportActions from "@/components/dashboard/ReportActions";
import FileUpload from "@/components/dashboard/FileUpload";
import DataHandlingNotice from "@/components/dashboard/DataHandlingNotice";
import PromptBar from "@/components/dashboard/PromptBar";
import ChatPanel, { type ChatMessage } from "@/components/dashboard/ChatPanel";
import ChartCard from "@/components/dashboard/ChartCard";
import VisualPicker from "@/components/dashboard/VisualPicker";
import SummaryPanel from "@/components/dashboard/SummaryPanel";
import InsightsPanel from "@/components/dashboard/InsightsPanel";
import DataPanel from "@/components/dashboard/DataPanel";
import DataHealthCheck from "@/components/dashboard/DataHealthCheck";
import AutoDashboard from "@/components/dashboard/AutoDashboard";
import SheetSelectorDialog from "@/components/dashboard/SheetSelectorDialog";
import AxisBuilder from "@/components/dashboard/AxisBuilder";
import StoryDashboard from "@/components/dashboard/StoryDashboard";
import PredictionPanel from "@/components/dashboard/PredictionPanel";
import PredictionInsightsPanel from "@/components/dashboard/PredictionInsightsPanel";
import type { ParsedData } from "@/lib/data-processing";
import type { SheetInfo } from "@/lib/data-processing";
import { parseExcelSheet } from "@/lib/data-processing";
import type { ChartConfig, ChartType } from "@/lib/chart-types";
import { interpretPrompt } from "@/lib/local-ai";
import { generateSummary } from "@/lib/summarize";
import { toast } from "sonner";
import { getProjects, saveProjects, type Project } from "@/pages/Projects";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { clearReportStore } from "@/lib/report-store";
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

type Tab = "upload" | "preview" | "health" | "insights" | "dashboard" | "auto" | "story" | "prediction" | "prediction-insights";

const tabs: { id: Tab; label: string; icon: React.ElementType; needsData: boolean }[] = [
  { id: "upload", label: "Upload", icon: Upload, needsData: false },
  { id: "preview", label: "Preview", icon: Eye, needsData: true },
  { id: "health", label: "Health Check", icon: HeartPulse, needsData: true },
  { id: "insights", label: "Insights", icon: Lightbulb, needsData: true },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, needsData: true },
  { id: "auto", label: "Auto Dashboard", icon: Wand2, needsData: true },
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
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [sheetsExpanded, setSheetsExpanded] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [sheetLoading, setSheetLoading] = useState(false);
  const [data, setData] = useState<ParsedData | null>(null);
  const [datasetVersion, setDatasetVersion] = useState(0);
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
  const [pendingChartType, setPendingChartType] = useState<ChartType | null>(null);

  useEffect(() => {
    if (activeTab === "dashboard") setToolsOpen(true);
    if (activeTab === "preview") setSheetsExpanded(true);
  }, [activeTab]);

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "dashboard") setToolsOpen(true);
    if (tab === "preview") setSheetsExpanded(true);
    if (window.matchMedia("(max-width: 1023px)").matches && tab !== "preview") setNavigationOpen(false);
  };

  const loadSheet = async (name: string) => {
    if (!excelFile || sheetLoading) return;
    setSheetLoading(true);
    try {
      const parsed = await parseExcelSheet(excelFile, name);
      if (!parsed.rows.length) { toast.error("This sheet appears to be empty."); return; }
      clearReportStore();
      setDatasetVersion(version => version + 1);
      setData(parsed);
      setSelectedSheet(name);
      setFileName(`${excelFile.name} — ${name}`);
      setCharts([]);
      setSummaryText("");
      setAiResponse("");
      setChatMessages([]);
      setSlicerFilters({});
      setPendingChartType(null);
      setActiveTab("preview");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load sheet.");
    } finally { setSheetLoading(false); }
  };

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
    clearReportStore();
    setDatasetVersion(version => version + 1);
    setData(parsed);
    setFileName(name);
    setCharts([]);
    setSummaryText("");
    setAiResponse("");
    setChatMessages([]);
    setSlicerFilters({});
    setPendingChartType(null);
    setExcelSheets([]);
    setExcelFile(null);
    setSelectedSheet("");
    setActiveTab("preview");
  }, []);

  const handleReset = useCallback(() => {
    clearReportStore();
    setData(null);
    setFileName("");
    setCharts([]);
    setSummaryText("");
    setAiResponse("");
    setChatMessages([]);
    setSlicerFilters({});
    setExcelSheets([]);
    setExcelFile(null);
    setSelectedSheet("");
    setPendingChartType(null);
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
      setToolsOpen(true);
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
    (xInput: string | string[], yKeys: string[], chartType: ChartType) => {
      if (!data) return;
      try {
        const xKeys = Array.isArray(xInput) ? xInput : [xInput];
        const multiX = xKeys.length > 1;
        const xKey = multiX ? xKeys.join(" / ") : xKeys[0];
        const rows = multiX
          ? data.rows.map(r => ({ ...r, [xKey]: xKeys.map(k => String(r[k] ?? "Unknown")).join(" / ") }))
          : data.rows;
        const agg = (rows: Record<string, unknown>[], gk: string, vk: string) => {
          const map = new Map<string, number>();
          for (const row of rows) {
            const key = String(row[gk] ?? "Unknown");
            map.set(key, (map.get(key) || 0) + (Number(row[vk]) || 0));
          }
          return Array.from(map.entries()).map(([k, v]) => ({ [gk]: k, [vk]: Math.round(v * 100) / 100 }));
        };

        const stringCols = data.columns.filter(c => c.type === "string" || c.type === "date").map(c => c.name);
        const isCategory = multiX || stringCols.includes(xKey);
        let chartData: Record<string, unknown>[];

        if (isCategory && yKeys.length === 1) {
          chartData = agg(rows, xKey, yKeys[0]);
        } else if (isCategory && yKeys.length > 1) {
          const map = new Map<string, Record<string, number>>();
          for (const row of rows) {
            const key = String(row[xKey] ?? "Unknown");
            if (!map.has(key)) map.set(key, {});
            const entry = map.get(key)!;
            for (const yk of yKeys) {
              entry[yk] = (entry[yk] || 0) + (Number(row[yk]) || 0);
            }
          }
          chartData = Array.from(map.entries()).map(([k, v]) => ({ [xKey]: k, ...v }));
        } else {
          chartData = rows.slice(0, 100);
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
    <div className="h-dvh overflow-hidden bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex min-h-14 items-center justify-between flex-wrap gap-2 px-4 py-2">
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" aria-label="Toggle navigation" aria-expanded={navigationOpen} aria-controls="workspace-navigation" onClick={() => setNavigationOpen(v => !v)}>
              <Menu className="h-4 w-4" />
            </Button>
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Cognilytix AI</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDarkMode(mode => !mode)} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} title="Home">
              <Home className="h-4 w-4 mr-1" /> Home
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
              <FolderOpen className="h-4 w-4 mr-1" /> Projects
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/reports")}>
              <FileText className="h-4 w-4 mr-1" /> Reports
            </Button>
            {data && (
              <ReportActions
                title={fileName.replace(/\.[^/.]+$/, "") || "Cognilytix Report"}
                fileName={fileName}
                data={data}
                charts={charts}
                summaryText={summaryText}
              />
            )}
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/auth"); }} title={user?.email ?? "Sign out"}>
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="relative flex flex-1 min-h-0 overflow-hidden">
      {navigationOpen && <div className="absolute inset-0 z-30 bg-background/80 lg:hidden" onClick={() => setNavigationOpen(false)} />}
      <nav id="workspace-navigation" aria-label="Workspace tabs" className={navigationOpen ? "absolute inset-y-0 left-0 z-40 lg:relative w-60 shrink-0 border-r border-border bg-card overflow-y-auto" : "hidden"}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground">WORKSPACE</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Close navigation" onClick={() => setNavigationOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-col gap-1 p-3">
          {tabs.map(tab => {
            const disabled = tab.needsData && !data;
            const Icon = tab.icon;
            return (
              <div key={tab.id}>
              <Button
                variant="ghost"
                key={tab.id}
                disabled={disabled}
                onClick={() => !disabled && selectTab(tab.id)}
                aria-current={activeTab === tab.id ? "page" : undefined}
                className={`w-full justify-start gap-2 px-3 h-10 text-sm font-medium ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
                {tab.id === "preview" && data && <ChevronDown className="h-4 w-4 ml-auto" />}
              </Button>
              {tab.id === "preview" && data && sheetsExpanded && (
                <div className="ml-5 pl-3 border-l border-border mt-1 mb-2 space-y-1">
                  <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground" aria-expanded={sheetsExpanded} onClick={() => setSheetsExpanded(false)}>
                    {excelSheets.length || 1} {excelSheets.length === 1 || !excelSheets.length ? "sheet" : "sheets"}<ChevronDown className="h-3 w-3" />
                  </Button>
                  {excelSheets.length ? excelSheets.map(sheet => (
                    <Button key={sheet.name} variant="ghost" size="sm" disabled={sheetLoading || sheet.rowCount === 0} onClick={() => loadSheet(sheet.name)} title={`${sheet.name}: ${sheet.rowCount} rows`} className={`w-full justify-start gap-2 text-xs ${selectedSheet === sheet.name ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                      <Layers className="h-3 w-3 shrink-0" /><span className="truncate">{sheet.name}</span>
                    </Button>
                  )) : <p className="px-3 py-2 text-xs text-muted-foreground truncate" title={fileName}>{fileName}</p>}
                </div>
              )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Tab Content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* UPLOAD TAB */}
        {activeTab === "upload" && (
          <div className="max-w-3xl mx-auto p-6">
            <FileUpload
              onDataLoaded={handleDataLoaded}
              onSheetsDetected={(sheets, file, name) => {
                clearReportStore();
                setData(null);
                setDatasetVersion(version => version + 1);
                setCharts([]);
                setSummaryText("");
                setAiResponse("");
                setChatMessages([]);
                setSlicerFilters({});
                setPendingChartType(null);
                setSelectedSheet("");
                setExcelSheets(sheets);
                setExcelFile(file);
                setFileName(name);
                setSheetSelectorOpen(true);
              }}
            />
            <DataHandlingNotice />
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
        {data && (
          <div data-tab-panel className={activeTab === "dashboard" ? "p-4 space-y-4" : "hidden p-4 space-y-4"}>
            {/* Prompt bar */}
            <div className="max-w-4xl mx-auto">
              <PromptBar onSubmit={handlePrompt} isLoading={isProcessing} disabled={!data} />
              <ChatPanel messages={chatMessages} isLoading={isProcessing} />
            </div>

            {/* Auto Dashboard CTA */}
            <div className="max-w-4xl mx-auto rounded-lg border border-primary/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary" />
                  Generate a full executive dashboard automatically
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">KPIs, trend lines, comparisons & filters — built from your data in one click.</p>
              </div>
              <Button variant="hero" size="sm" onClick={() => setActiveTab("auto")}>
                <Wand2 className="h-4 w-4 mr-1" /> Create Visualization Dashboard
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <h2 className="text-lg font-semibold">Dashboard</h2>
              <Button variant="outline" size="sm" onClick={() => setToolsOpen(v => !v)} aria-expanded={toolsOpen} aria-controls="visualization-tools">
                <PanelRightOpen className="h-4 w-4 mr-2" /> {toolsOpen ? "Hide tools" : "Visualizations"}
              </Button>
            </div>
            <div aria-label="Connected data blocks" className="flex items-center gap-2 flex-wrap py-2 text-xs">
              <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 min-w-0 max-w-full"><Database className="h-4 w-4 text-primary shrink-0" /><span className="truncate max-w-48" title={fileName}>{selectedSheet || fileName}</span></div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="rounded-md border border-border bg-card px-3 py-2">{data.rows.length.toLocaleString()} rows · {data.columns.length} columns</div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="rounded-md border border-primary/30 bg-primary/5 text-primary px-3 py-2">{charts.length} visuals</div>
            </div>

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
        {/* AUTO DASHBOARD TAB */}
        {data && (
          <div data-tab-panel className={activeTab === "auto" ? "max-w-7xl mx-auto p-6 space-y-4" : "hidden"}>
            <ReportActions mode="executive" title={fileName.replace(/\.[^/.]+$/, "") || "Cognilytix Report"} fileName={fileName} data={data} charts={charts} summaryText={summaryText} />
            <AutoDashboard key={datasetVersion} data={data} />
          </div>
        )}

        {/* STORY / PREDICTION TABS — kept mounted so results persist across tab switches */}
        {data && (
          <div data-tab-panel className={activeTab === "story" ? "" : "hidden"}>
            <StoryDashboard key={datasetVersion} data={data} charts={charts} summaryText={summaryText} />
          </div>
        )}
        {data && (
          <div data-tab-panel id="prediction-panel-root" className={activeTab === "prediction" ? "" : "hidden"}>
            <PredictionPanel key={datasetVersion} data={data} />
          </div>
        )}
        {data && (
          <div data-tab-panel className={activeTab === "prediction-insights" ? "" : "hidden"}>
            <div className="max-w-6xl mx-auto px-6 pt-4"><ReportActions mode="executive" title={fileName.replace(/\.[^/.]+$/, "") || "Cognilytix Report"} fileName={fileName} data={data} charts={charts} summaryText={summaryText} /></div>
            <PredictionInsightsPanel key={datasetVersion} data={data} />
          </div>
        )}
      </main>
      {data && (
        <aside id="visualization-tools" aria-label="Visualization tools" className={activeTab === "dashboard" && toolsOpen ? "absolute sm:relative inset-y-0 right-0 z-20 w-[344px] max-w-[calc(100%-24px)] shrink-0 border-l border-border bg-card overflow-y-auto" : "hidden"}>
          <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Build a visual</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Close visualization tools" onClick={() => setToolsOpen(false)}><PanelRightClose className="h-4 w-4" /></Button>
          </div>
          <VisualPicker compact onSelect={handleVisualPick} />
          <AxisBuilder key={datasetVersion} compact columns={data.columns} onCreateChart={handleAxisCreate} presetType={pendingChartType} onPresetConsumed={() => setPendingChartType(null)} />
        </aside>
      )}
      </div>

      {/* Sheet Selector Dialog */}
      <SheetSelectorDialog
        open={sheetSelectorOpen}
        onOpenChange={setSheetSelectorOpen}
        sheets={excelSheets}
        file={excelFile}
        fileName={fileName}
        onSheetLoaded={(parsedData, name) => {
          clearReportStore();
          setDatasetVersion(version => version + 1);
          setData(parsedData);
          setSelectedSheet(name.split(" — ").slice(1).join(" — "));
          setFileName(name);
          setCharts([]);
          setSummaryText("");
          setAiResponse("");
          setChatMessages([]);
          setPendingChartType(null);
          setSlicerFilters({});
          setActiveTab("preview");
        }}
      />
    </div>
  );
}
