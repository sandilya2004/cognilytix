import { useMemo, useState } from "react";
import { Palette, Shuffle } from "lucide-react";
import { TrendingUp, DollarSign, Award, MapPin, Package, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import type { ParsedData } from "@/lib/data-processing";
import { toast } from "sonner";

interface Props {
  data: ParsedData;
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

export default function AutoDashboard({ data }: Props) {
  const cols = useMemo(() => detectColumns(data), [data]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  // A fresh palette is picked automatically each time a dashboard is created
  const [paletteName, setPaletteName] = useState(() => PALETTE_NAMES[Math.floor(Math.random() * PALETTE_NAMES.length)]);
  const [chartCount, setChartCount] = useState(5);
  const [layout, setLayout] = useState<Layout>("sidebar");
  const P = PALETTES[paletteName];

  const filteredRows = useMemo(() => {
    const active = Object.entries(filters).filter(([, v]) => v && v !== "__all__");
    if (active.length === 0) return data.rows;
    return data.rows.filter((r) => active.every(([k, v]) => String(r[k] ?? "") === v));
  }, [data.rows, filters]);

  const sum = (k: string) => filteredRows.reduce((s, r) => s + (Number(r[k]) || 0), 0);

  const kpis = useMemo(() => {
    const out: { label: string; value: string; icon: typeof DollarSign }[] = [];
    if (cols.revenueCol) out.push({ label: `Total ${cols.revenueCol}`, value: formatNum(sum(cols.revenueCol)), icon: DollarSign });
    if (cols.profitCol && cols.profitCol !== cols.revenueCol) {
      const prof = sum(cols.profitCol);
      out.push({ label: `Total ${cols.profitCol}`, value: formatNum(prof), icon: TrendingUp });
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
    out.push({ label: "Total Records", value: formatNum(filteredRows.length), icon: TrendingUp });
    return out.slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, filteredRows]);

  const trendData = useMemo(() => {
    if (!cols.dateCols[0] || !cols.revenueCol) return null;
    const second = cols.profitCol && cols.profitCol !== cols.revenueCol ? cols.profitCol : null;
    const map = new Map<string, { value: number; value2: number }>();
    for (const r of filteredRows) {
      const raw = r[cols.dateCols[0]];
      if (!raw) continue;
      const d = new Date(String(raw));
      const key = isNaN(d.getTime()) ? String(raw) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const e = map.get(key) || { value: 0, value2: 0 };
      e.value += Number(r[cols.revenueCol!]) || 0;
      if (second) e.value2 += Number(r[second]) || 0;
      map.set(key, e);
    }
    return Array.from(map.entries()).map(([period, v]) => ({ period, ...v })).sort((a, b) => a.period.localeCompare(b.period));
  }, [cols, filteredRows]);

  const barData = useMemo(() => cols.categoryCol && cols.revenueCol ? aggregateBy(filteredRows, cols.categoryCol, cols.revenueCol).slice(0, 8) : null, [cols, filteredRows]);
  const pieCol = cols.regionCol ?? cols.stringCols.find((c) => c !== cols.categoryCol) ?? null;
  const pieData = useMemo(() => pieCol && cols.revenueCol ? aggregateBy(filteredRows, pieCol, cols.revenueCol).slice(0, 6) : null, [pieCol, cols, filteredRows]);
  const compData = useMemo(() => {
    if (cols.numericCols.length < 2 || !cols.categoryCol) return null;
    const keys = cols.numericCols.slice(0, 2);
    const map = new Map<string, Record<string, number>>();
    for (const r of filteredRows) {
      const k = String(r[cols.categoryCol] ?? "Unknown");
      const e = map.get(k) || {};
      for (const nc of keys) e[nc] = (e[nc] || 0) + (Number(r[nc]) || 0);
      map.set(k, e);
    }
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => (Number(b[keys[0]]) || 0) - (Number(a[keys[0]]) || 0)).slice(0, 8);
  }, [cols, filteredRows]);
  const secondCatCol = cols.stringCols.find((c) => c !== cols.categoryCol && c !== pieCol) ?? null;
  const secondBar = useMemo(() => {
    const val = cols.numericCols[1] ?? cols.revenueCol;
    if (!secondCatCol || !val) return null;
    return { val, rows: aggregateBy(filteredRows, secondCatCol, val).slice(0, 8) };
  }, [cols, secondCatCol, filteredRows]);

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
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      let w = pageW - 10, h = w / ratio;
      if (h > pageH - 10) { h = pageH - 10; w = h * ratio; }
      pdf.addImage(canvas.toDataURL("image/png", 1.0), "PNG", (pageW - w) / 2, 5, w, h);
      pdf.save("auto-dashboard.pdf");
      toast.success("Dashboard exported!", { id: "auto-pdf" });
    } catch {
      toast.error("Export failed", { id: "auto-pdf" });
    }
  };

  const tip = { contentStyle: { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 } };
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />;

  const charts: { key: string; title: string; wide?: boolean; node: JSX.Element }[] = [];
  if (trendData && trendData.length > 1) charts.push({
    key: "trend", title: `${cols.revenueCol} Trend`, wide: true,
    node: (
      <ComposedChart data={trendData}>{grid}
        <XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={formatNum} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="value" name={cols.revenueCol!} fill={P[0]} radius={[4, 4, 0, 0]} />
        {cols.profitCol && cols.profitCol !== cols.revenueCol && <Line type="monotone" dataKey="value2" name={cols.profitCol} stroke={P[1]} strokeWidth={2.5} dot={{ r: 3 }} />}
      </ComposedChart>
    ),
  });
  if (barData) charts.push({
    key: "bar", title: `${cols.revenueCol} by ${cols.categoryCol}`,
    node: (
      <BarChart data={barData} layout="vertical">{grid}
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatNum} /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} /><Tooltip {...tip} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>{barData.map((_, i) => <Cell key={i} fill={P[i % P.length]} />)}</Bar>
      </BarChart>
    ),
  });
  if (pieData) charts.push({
    key: "pie", title: `Distribution by ${pieCol}`,
    node: (
      <PieChart>
        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
          {pieData.map((_, i) => <Cell key={i} fill={P[i % P.length]} />)}
        </Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    ),
  });
  if (trendData && trendData.length > 1) charts.push({
    key: "area", title: `Cumulative ${cols.revenueCol}`,
    node: (
      <AreaChart data={trendData.reduce<{ period: string; value: number }[]>((acc, d) => { acc.push({ period: d.period, value: (acc.at(-1)?.value ?? 0) + d.value }); return acc; }, [])}>
        <defs><linearGradient id="autoArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={P[2]} stopOpacity={0.5} /><stop offset="100%" stopColor={P[2]} stopOpacity={0.05} /></linearGradient></defs>
        {grid}<XAxis dataKey="period" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={formatNum} /><Tooltip {...tip} />
        <Area type="monotone" dataKey="value" stroke={P[2]} strokeWidth={2.5} fill="url(#autoArea)" />
      </AreaChart>
    ),
  });
  if (compData) charts.push({
    key: "comp", title: `${cols.numericCols.slice(0, 2).join(" vs ")} by ${cols.categoryCol}`,
    node: (
      <BarChart data={compData}>{grid}
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} /><YAxis tick={{ fontSize: 11 }} tickFormatter={formatNum} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
        {cols.numericCols.slice(0, 2).map((nc, i) => <Bar key={nc} dataKey={nc} fill={P[(i + 3) % P.length]} radius={[4, 4, 0, 0]} />)}
      </BarChart>
    ),
  });
  if (secondBar && secondBar.rows.length > 1) charts.push({
    key: "bar2", title: `${secondBar.val} by ${secondCatCol}`,
    node: (
      <BarChart data={secondBar.rows}>{grid}
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} /><YAxis tick={{ fontSize: 11 }} tickFormatter={formatNum} /><Tooltip {...tip} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>{secondBar.rows.map((_, i) => <Cell key={i} fill={P[(i + 2) % P.length]} />)}</Bar>
      </BarChart>
    ),
  });
  const shown = charts.slice(0, chartCount);

  const slicers = filterCols.length > 0 && (
    <Card className={layout === "sidebar" ? "h-fit lg:sticky lg:top-2" : ""}>
      <CardHeader className="pb-3"><CardTitle className="text-sm">Slicers</CardTitle></CardHeader>
      <CardContent className={layout === "sidebar" ? "flex flex-col gap-3" : "flex flex-wrap gap-3"}>
        {filterCols.map((f) => (
          <div key={f.name} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">{f.name}</label>
            <select
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
    <div className={layout === "stacked" ? "grid gap-4" : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"}>
      {shown.map((c, i) => (
        <Card key={c.key} className={layout !== "stacked" && c.wide && i === 0 ? "md:col-span-2" : ""} style={{ borderTop: `3px solid ${P[i % P.length]}` }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{c.title}</CardTitle></CardHeader>
          <CardContent><ResponsiveContainer width="100%" height={260}>{c.node}</ResponsiveContainer></CardContent>
        </Card>
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

      <div id="auto-dashboard-root" className="space-y-4 bg-background p-2 rounded-lg">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {kpis.map((k, i) => {
            const Icon = k.icon;
            const c = P[i % P.length];
            return (
              <Card key={k.label} className="overflow-hidden" style={{ background: `linear-gradient(135deg, ${c}22, transparent 70%)`, borderColor: `${c}66` }}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-primary-foreground shrink-0" style={{ background: c }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium truncate">{k.label}</p>
                    <p className="text-xl font-bold text-foreground truncate">{k.value}</p>
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
    </div>
  );
}
