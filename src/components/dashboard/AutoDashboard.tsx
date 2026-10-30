import { useMemo, useState } from "react";
import { Palette, Shuffle, Plus, X, Hash, Maximize2 } from "lucide-react";
import { TrendingUp, DollarSign, Award, MapPin, Package, FileDown } from "lucide-react";
import VisualPicker from "@/components/dashboard/VisualPicker";
import AxisBuilder from "@/components/dashboard/AxisBuilder";
import ChartCard from "@/components/dashboard/ChartCard";
import { buildAxisChart } from "@/lib/axis-chart";
import type { ChartType } from "@/lib/chart-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildAutomaticPlan, nextAutomaticCount, RECORD_COUNT, ROW_CATEGORY, type AutomaticSpec } from "@/lib/automatic-chart-plan";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import type { ParsedData } from "@/lib/data-processing";
import { toast } from "sonner";

interface Props {
  data: ParsedData;
  allowCustomCharts?: boolean;
  datasetNotice?: string;
}

export const PALETTES: Record<string, string[]> = {
  Ocean: ["#0ea5e9", "#6366f1", "#14b8a6", "#38bdf8", "#818cf8", "#2dd4bf", "#0284c7", "#4f46e5"],
  Sunset: ["#f97316", "#ef4444", "#f59e0b", "#ec4899", "#fb7185", "#facc15", "#ea580c", "#be123c"],
  Forest: ["#16a34a", "#65a30d", "#0d9488", "#84cc16", "#22c55e", "#15803d", "#a3e635", "#047857"],
  Neon: ["#3b82f6", "#a855f7", "#22d3ee", "#f472b6", "#facc15", "#34d399", "#f43f5e", "#818cf8"],
  Royal: ["#4f46e5", "#7c3aed", "#c026d3", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4"],
  Earth: ["#b45309", "#78716c", "#a16207", "#57534e", "#d97706", "#92400e", "#a8a29e", "#ca8a04"],
};
const PALETTE_NAMES = Object.keys(PALETTES);
type Layout = "sidebar" | "grid" | "stacked";

function formatNum(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function formatFull(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function detectColumns(data: ParsedData) {
  const numericCols = data.columns.filter((c) => c.type === "number").map((c) => c.name);
  const dateCols = data.columns.filter((c) => c.type === "date").map((c) => c.name);
  const stringCols = data.columns.filter((c) => c.type === "string").map((c) => c.name);

  // Heuristics for revenue/profit columns
  const findCol = (keywords: string[]) =>
    numericCols.find((n) => keywords.some((k) => n.toLowerCase().includes(k))) ?? null;
  const revenueCol = findCol(["revenue", "sales", "amount", "total", "income"]) ?? numericCols[0] ?? null;
  const profitCol = findCol(["profit", "margin", "net"]) ?? numericCols[1] ?? null;

  // Find category columns
  const findCatCol = (keywords: string[]) =>
    stringCols.find((n) => keywords.some((k) => n.toLowerCase().includes(k))) ?? null;
  const regionCol = findCatCol(["region", "country", "state", "city", "location"]);
  const productCol = findCatCol(["product", "item", "sku", "name", "category"]);
  const categoryCol = findCatCol(["category", "type", "segment", "group"]) ?? productCol;

  return { numericCols, dateCols, stringCols, revenueCol, profitCol, regionCol, productCol, categoryCol };
}

function aggregateBy(rows: Record<string, unknown>[], groupKey: string, valueKey: string) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = String(r[groupKey] ?? "Unknown");
    map.set(k, (map.get(k) || 0) + (Number(r[valueKey]) || 0));
  }
  return Array.from(map.entries())
    .map(([k, v]) => ({ name: k, value: Math.round(v * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

export default function AutoDashboard({ data, allowCustomCharts = true, datasetNotice }: Props) {
  const cols = useMemo(() => detectColumns(data), [data]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  // A fresh palette is picked automatically each time a dashboard is created
  const [paletteName, setPaletteName] = useState(() => PALETTE_NAMES[Math.floor(Math.random() * PALETTE_NAMES.length)]);
  const [chartCount, setChartCount] = useState(5);
  const [layout, setLayout] = useState<Layout>("sidebar");
  const [showBuilder, setShowBuilder] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<ChartType | null>(null);
  const [customSpecs, setCustomSpecs] = useState<{ id: string; x: string[]; y: string[]; type: ChartType }[]>([]);
  const P = PALETTES[paletteName];

  const filteredRows = useMemo(() => {
    const active = Object.entries(filters).filter(([, v]) => v && v !== "__all__");
    if (active.length === 0) return data.rows;
    return data.rows.filter((r) => active.every(([k, v]) => String(r[k] ?? "") === v));
  }, [data.rows, filters]);

  const sum = (k: string) => filteredRows.reduce((s, r) => s + (Number(r[k]) || 0), 0);

  const kpis = useMemo(() => {
    const out: { label: string; value: string; icon: typeof DollarSign }[] = [];
    if (cols.revenueCol) out.push({ label: `Total ${cols.revenueCol}`, value: formatFull(sum(cols.revenueCol)), icon: DollarSign });
    if (cols.profitCol && cols.profitCol !== cols.revenueCol) {
      const prof = sum(cols.profitCol);
      out.push({ label: `Total ${cols.profitCol}`, value: formatFull(prof), icon: TrendingUp });
      const rev = cols.revenueCol ? sum(cols.revenueCol) : 0;
      out.push({ label: "Profit Margin", value: `${rev > 0 ? ((prof / rev) * 100).toFixed(1) : "0"}%`, icon: Award });
    }
    if (cols.regionCol && cols.revenueCol) {
      const agg = aggregateBy(filteredRows, cols.regionCol, cols.revenueCol);
      if (agg.length) out.push({ label: "Top " + cols.regionCol, value: agg[0].name, icon: MapPin });
    }
    if (cols.productCol && cols.revenueCol) {
      const agg = aggregateBy(filteredRows, cols.productCol, cols.revenueCol);
      if (agg.length) out.push({ label: "Best " + cols.productCol, value: agg[0].name, icon: Package });
    }
    out.push({ label: "Total Records", value: formatFull(filteredRows.length), icon: TrendingUp });
    return out.slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, filteredRows]);

  // Plan from the full dataset; slicers never change the available chart slots.
  const specs = useMemo(() => buildAutomaticPlan(data), [data]);
  const valueOf = (row: Record<string, unknown>, key: string) => key === RECORD_COUNT ? 1 : (Number(row[key]) || 0);
  const chartRows = filteredRows.map((row, index) => ({ ...row, [RECORD_COUNT]: 1, [ROW_CATEGORY]: String(index + 1) }));

  const trendOf = (val: string, val2: string | null) => {
    const map = new Map<string, { value: number; value2: number }>();
    for (const r of filteredRows) {
      const raw = r[cols.dateCols[0]];
      if (!raw) continue;
      const d = new Date(String(raw));
      const key = isNaN(d.getTime()) ? String(raw) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const e = map.get(key) || { value: 0, value2: 0 };
      e.value += valueOf(r, val);
      if (val2) e.value2 += valueOf(r, val2);
      map.set(key, e);
    }
    return Array.from(map.entries()).map(([period, v]) => ({ period, ...v })).sort((a, b) => a.period.localeCompare(b.period));
  };

  const tip = { contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 } };
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />;

  const renderSpec = (s: AutomaticSpec, idx: number, expanded = false): { key: string; title: string; wide?: boolean; empty: boolean; node: JSX.Element } => {
    const key = `${s.kind}-${idx}`;
    if (s.kind === "trend") {
      const d = trendOf(s.val, s.val2);
      return { key, title: `${s.val} Trend`, wide: true, empty: d.length === 0, node: (
        <ComposedChart data={d} margin={{ top: 12, right: 24, bottom: 12, left: 8 }}>{grid}
          <XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={formatNum} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="value" name={s.val} fill={P[0]} radius={[4, 4, 0, 0]} />
          {s.val2 && <Line type="monotone" dataKey="value2" name={s.val2} stroke={P[1]} strokeWidth={2.5} dot={{ r: 3 }} />}
        </ComposedChart>) };
    }
    if (s.kind === "cumulative") {
      const d = trendOf(s.val, null).reduce<{ period: string; value: number }[]>((acc, x) => { acc.push({ period: x.period, value: (acc.at(-1)?.value ?? 0) + x.value }); return acc; }, []);
      return { key, title: `Cumulative ${s.val}`, empty: d.length === 0, node: (
        <AreaChart data={d} margin={{ top: 12, right: 24, bottom: 12, left: 8 }}>
          <defs><linearGradient id={`autoArea${idx}${expanded ? "Expanded" : ""}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={P[2]} stopOpacity={0.5} /><stop offset="100%" stopColor={P[2]} stopOpacity={0.05} /></linearGradient></defs>
          {grid}<XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={formatNum} /><Tooltip {...tip} />
          <Area type="monotone" dataKey="value" stroke={P[2]} strokeWidth={2.5} fill={`url(#autoArea${idx}${expanded ? "Expanded" : ""})`} />
        </AreaChart>) };
    }
    if (s.kind === "comp") {
      const map = new Map<string, Record<string, number>>();
      for (const r of chartRows) {
        const k = String(r[s.cat] ?? "Unknown");
        const e = map.get(k) || {};
        for (const nc of s.vals) e[nc] = (e[nc] || 0) + (Number(r[nc]) || 0);
        map.set(k, e);
      }
      const d = Array.from(map.entries()).map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => (Number(b[s.vals[0]]) || 0) - (Number(a[s.vals[0]]) || 0)).slice(0, 8);
      return { key, title: `${s.vals.join(" vs ")} by ${s.cat}`, empty: d.length === 0, node: (
        <BarChart data={d} margin={{ top: 12, right: 24, bottom: 18, left: 8 }}>{grid}
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} /><YAxis tick={{ fontSize: 11 }} tickFormatter={formatNum} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
          {s.vals.map((nc, i) => <Bar key={nc} dataKey={nc} fill={P[(i + 3) % P.length]} radius={[4, 4, 0, 0]} />)}
        </BarChart>) };
    }
    const d = aggregateBy(chartRows, s.cat, s.val).slice(0, s.kind === "pie" ? 6 : 8);
    if (s.kind === "pie") return { key, title: `${s.val} distribution by ${s.cat}`, empty: d.length === 0, node: (
      <PieChart>
        <Pie data={d} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={expanded ? "38%" : "32%"} outerRadius={expanded ? "65%" : "58%"} paddingAngle={2}>
          {d.map((_, i) => <Cell key={i} fill={P[i % P.length]} />)}
        </Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>) };
    if (s.kind === "hbar") return { key, title: `${s.val} by ${s.cat}`, empty: d.length === 0, node: (
      <BarChart data={d} layout="vertical" margin={{ top: 12, right: 24, bottom: 12, left: 8 }}>{grid}
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatNum} /><YAxis type="category" dataKey="name" width={expanded ? 160 : 100} tick={{ fontSize: 10 }} tickFormatter={(v: string) => !expanded && String(v).length > 16 ? `${String(v).slice(0, 15)}…` : String(v)} /><Tooltip {...tip} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>{d.map((_, i) => <Cell key={i} fill={P[i % P.length]} />)}</Bar>
      </BarChart>) };
    return { key, title: `${s.val} by ${s.cat}`, empty: d.length === 0, node: (
      <BarChart data={d} margin={{ top: 12, right: 24, bottom: 18, left: 8 }}>{grid}
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} /><YAxis tick={{ fontSize: 11 }} tickFormatter={formatNum} /><Tooltip {...tip} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>{d.map((_, i) => <Cell key={i} fill={P[(i + 2) % P.length]} />)}</Bar>
      </BarChart>) };
  };

  const shown = specs.slice(0, chartCount).map((s, i) => renderSpec(s, i));

  const filterCols = useMemo(() => cols.stringCols
    .map((c) => {
      const set = new Set(data.rows.map((r) => String(r[c] ?? "")).filter(Boolean));
      return { name: c, options: Array.from(set).slice(0, 50), count: set.size };
    })
    .filter((f) => f.count >= 2 && f.count <= 50)
    .slice(0, 6), [cols, data]);

  const exportPDF = async () => {
    const el = document.getElementById("auto-dashboard-root");
    if (!el) return;
    toast.loading("Exporting dashboard…", { id: "auto-pdf" });
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");
      const canvas = await html2canvas(el, { backgroundColor: getComputedStyle(document.body).backgroundColor, scale: 2, useCORS: true });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const w = pageW - 10;
      const pxPerPage = Math.floor(canvas.width * ((pageH - 10) / w));
      for (let y = 0, page = 0; y < canvas.height; y += pxPerPage, page++) {
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = Math.min(pxPerPage, canvas.height - y);
        const context = slice.getContext("2d");
        if (!context) throw new Error("Could not render PDF page");
        context.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
        if (page > 0) pdf.addPage();
        pdf.addImage(slice.toDataURL("image/png", 1.0), "PNG", 5, 5, w, slice.height * (w / canvas.width));
      }
      pdf.save("auto-dashboard.pdf");
      toast.success("Dashboard exported!", { id: "auto-pdf" });
    } catch {
      toast.error("Export failed", { id: "auto-pdf" });
    }
  };

  // ---- User-built "More Charts" (rebuilt from filtered rows so slicers apply) ----
  const customCharts = useMemo(
    () => customSpecs.map((c) => buildAxisChart(data, filteredRows, c.x, c.y, c.type, c.id)),
    [customSpecs, data, filteredRows],
  );
  const customKpis = customCharts.filter((c) => c.type === "kpi" || c.type === "card");
  const customVisuals = customCharts.filter((c) => c.type !== "kpi" && c.type !== "card");

  const slicers = filterCols.length > 0 && (
    <Card className={layout === "sidebar" ? "h-fit lg:sticky lg:top-2" : ""}>
      <CardHeader className="pb-3"><CardTitle className="text-sm">Slicers</CardTitle></CardHeader>
      <CardContent className={layout === "sidebar" ? "flex flex-col gap-3" : "flex flex-wrap gap-3"}>
        {filterCols.map((f) => (
          <div key={f.name} className="flex flex-col gap-1">
            <label htmlFor={`auto-filter-${f.name}`} className="text-xs font-medium text-muted-foreground">{f.name}</label>
            <select id={`auto-filter-${f.name}`}
              value={filters[f.name] ?? "__all__"}
              onChange={(e) => setFilters((prev) => ({ ...prev, [f.name]: e.target.value }))}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm min-w-[140px]"
            >
              <option value="__all__">All</option>
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        {Object.values(filters).some((v) => v && v !== "__all__") && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({})}>Clear all</Button>
        )}
      </CardContent>
    </Card>
  );

  const chartGrid = (
    <div className={layout === "stacked" ? "grid min-w-0 gap-4" : "grid min-w-0 gap-4 xl:grid-cols-2"}>
      {shown.map((c, i) => (
        <Card key={c.key} data-auto-chart className={`min-w-0 ${layout !== "stacked" && c.wide && i === 0 ? "xl:col-span-2" : ""}`} style={{ borderTop: `3px solid ${P[i % P.length]}` }}>
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
            <CardTitle className="text-sm leading-snug break-words min-w-0">{c.title}</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label={`Expand ${c.title}`} title="Expand chart" onClick={() => setExpandedKey(c.key)}><Maximize2 className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            {c.empty ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No rows match the selected slicers.</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>{c.node}</ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      ))}
      {customVisuals.map((c, j) => (
        <div key={c.id} data-auto-chart className="relative min-w-0 rounded-lg" style={{ borderTop: `3px solid ${P[(shown.length + j) % P.length]}` }}>
          <Button variant="outline" size="icon" className="absolute bottom-3 right-3 z-10 h-8 w-8" aria-label={`Expand ${c.title}`} title="Expand chart" onClick={() => setExpandedKey(c.id)}><Maximize2 className="h-4 w-4" /></Button>
          <ChartCard config={c} onRemove={(id) => setCustomSpecs((p) => p.filter((s) => s.id !== id))} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Auto-Generated Dashboard</h2>
          <p className="text-sm text-muted-foreground">Smart visualizations built automatically from your dataset.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportPDF}><FileDown className="h-4 w-4 mr-1" /> Export PDF</Button>
      </div>

      {/* Customisation */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-5">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Palette className="h-3.5 w-3.5" /> Color palette</p>
            <div className="flex flex-wrap gap-2">
              {PALETTE_NAMES.map((n) => (
                <button key={n} onClick={() => setPaletteName(n)} title={n}
                  className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${n === paletteName ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
                  <span className="flex">{PALETTES[n].slice(0, 4).map((c) => <span key={c} className="h-3 w-3 rounded-full -ml-0.5 first:ml-0 border border-background" style={{ background: c }} />)}</span>
                  {n}
                </button>
              ))}
              <Button variant="ghost" size="sm" className="h-7" onClick={() => setPaletteName(PALETTE_NAMES.filter((n) => n !== paletteName)[Math.floor(Math.random() * (PALETTE_NAMES.length - 1))])}>
                <Shuffle className="h-3.5 w-3.5 mr-1" /> Shuffle
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Charts</p>
            <div className="flex gap-1">
              {[3, 4, 5].map((n) => (
                <Button key={n} size="sm" variant={chartCount === n ? "default" : "outline"} className="h-7 w-9" onClick={() => setChartCount(n)}>{n}</Button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Layout</p>
            <div className="flex gap-1">
              {([["sidebar", "Slicer sidebar"], ["grid", "Grid"], ["stacked", "Stacked"]] as [Layout, string][]).map(([v, l]) => (
                <Button key={v} size="sm" variant={layout === v ? "default" : "outline"} className="h-7" onClick={() => setLayout(v)}>{l}</Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end items-center flex-wrap gap-2">
        <Badge variant="outline">{shown.length} automatic charts</Badge>
        <Button size="sm" variant="outline" disabled={chartCount >= specs.length} onClick={() => setChartCount(current => nextAutomaticCount(current, specs.length))}>
          <Plus className="h-4 w-4 mr-1" /> More Charts
        </Button>
        {allowCustomCharts && <Button size="sm" variant={showBuilder ? "default" : "outline"} onClick={() => setShowBuilder((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" /> Build Custom Chart
        </Button>}
      </div>
      {allowCustomCharts && showBuilder && (
        <div className="space-y-3">
          <VisualPicker onSelect={(t) => setPendingType(t)} />
          <AxisBuilder
            columns={data.columns}
            presetType={pendingType}
            onPresetConsumed={() => setPendingType(null)}
            onCreateChart={(x, y, type) => {
              setCustomSpecs((prev) => [...prev, { id: Math.random().toString(36).slice(2, 10), x, y, type }]);
              toast.success(type === "kpi" || type === "card" ? "KPI card added to dashboard" : "Chart added to dashboard");
            }}
          />
        </div>
      )}

      <div id="auto-dashboard-root" className="space-y-4 bg-background p-2 rounded-lg">
        {datasetNotice && <p className="border-l-2 border-accent pl-3 text-sm font-medium text-foreground">{datasetNotice}</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[...kpis, ...customKpis.map((c) => ({ label: c.kpiLabel ?? c.title, value: String(c.kpiValue ?? ""), icon: Hash, id: c.id }))].map((k, i) => {
            const Icon = k.icon;
            const c = P[i % P.length];
            const id = "id" in k ? (k as { id: string }).id : null;
            return (
              <Card key={id ?? k.label} className="relative" style={{ background: `linear-gradient(135deg, ${c}22, transparent 70%)`, borderColor: `${c}66` }}>
                {id && (
                  <button aria-label="Remove KPI" className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-destructive" onClick={() => setCustomSpecs((p) => p.filter((s) => s.id !== id))}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-primary-foreground shrink-0" style={{ background: c }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium leading-snug break-words">{k.label}</p>
                    <p className="text-lg font-bold text-foreground leading-snug break-words mt-0.5" title={k.value}>{k.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {layout === "sidebar" ? (
          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            {slicers || <div />}
            {chartGrid}
          </div>
        ) : (
          <>{slicers}{chartGrid}</>
        )}
        {shown.length < chartCount && (
          <p className="text-xs text-muted-foreground text-center">Your data supports {shown.length} automatic charts.</p>
        )}
        <Badge variant="outline" className="text-[10px]">Palette: {paletteName}</Badge>
      </div>
      <Dialog open={expandedKey !== null} onOpenChange={open => { if (!open) setExpandedKey(null); }}>
        <DialogContent className="w-[calc(100%-24px)] max-w-6xl max-h-[90dvh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader><DialogTitle className="pr-8 leading-snug">{shown.find(c => c.key === expandedKey)?.title ?? customVisuals.find(c => c.id === expandedKey)?.title ?? "Chart"}</DialogTitle></DialogHeader>
          {(() => {
            const index = shown.findIndex(c => c.key === expandedKey);
            const spec = specs[index];
            if (spec && index >= 0) {
              const chart = renderSpec(spec, index, true);
              return chart.empty ? <p className="py-12 text-muted-foreground">No rows match the selected slicers.</p> : <ResponsiveContainer width="100%" height={Math.max(260, Math.min(650, window.innerHeight * 0.65))}>{chart.node}</ResponsiveContainer>;
            }
            const chart = customVisuals.find(c => c.id === expandedKey);
            return chart ? <ChartCard config={chart} chartHeight={Math.max(260, Math.min(650, window.innerHeight * 0.6))} onRemove={id => { setCustomSpecs(p => p.filter(s => s.id !== id)); setExpandedKey(null); }} /> : null;
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
