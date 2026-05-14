import { useMemo, useState } from "react";
import { TrendingUp, DollarSign, Award, MapPin, Package, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import type { ParsedData } from "@/lib/data-processing";
import { toast } from "sonner";

interface Props {
  data: ParsedData;
}

const PALETTE = ["#4f46e5", "#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

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

  // Apply filters
  const filteredRows = useMemo(() => {
    const active = Object.entries(filters).filter(([, v]) => v && v !== "__all__");
    if (active.length === 0) return data.rows;
    return data.rows.filter((r) => active.every(([k, v]) => String(r[k] ?? "") === v));
  }, [data.rows, filters]);

  // KPIs
  const kpis = useMemo(() => {
    const out: { label: string; value: string; icon: typeof DollarSign; accent: string }[] = [];
    if (cols.revenueCol) {
      const total = filteredRows.reduce((s, r) => s + (Number(r[cols.revenueCol!]) || 0), 0);
      out.push({ label: `Total ${cols.revenueCol}`, value: formatNum(total), icon: DollarSign, accent: "from-indigo-500 to-purple-500" });
    }
    if (cols.profitCol && cols.profitCol !== cols.revenueCol) {
      const total = filteredRows.reduce((s, r) => s + (Number(r[cols.profitCol!]) || 0), 0);
      out.push({ label: `Total ${cols.profitCol}`, value: formatNum(total), icon: TrendingUp, accent: "from-emerald-500 to-teal-500" });
    }
    if (cols.revenueCol && cols.profitCol && cols.profitCol !== cols.revenueCol) {
      const rev = filteredRows.reduce((s, r) => s + (Number(r[cols.revenueCol!]) || 0), 0);
      const prof = filteredRows.reduce((s, r) => s + (Number(r[cols.profitCol!]) || 0), 0);
      const pct = rev > 0 ? ((prof / rev) * 100).toFixed(1) : "0";
      out.push({ label: "Profit Margin", value: `${pct}%`, icon: Award, accent: "from-amber-500 to-orange-500" });
    }
    if (cols.regionCol && cols.revenueCol) {
      const agg = aggregateBy(filteredRows, cols.regionCol, cols.revenueCol);
      if (agg.length > 0) out.push({ label: "Top " + cols.regionCol, value: agg[0].name, icon: MapPin, accent: "from-sky-500 to-blue-500" });
    }
    if (cols.productCol && cols.revenueCol) {
      const agg = aggregateBy(filteredRows, cols.productCol, cols.revenueCol);
      if (agg.length > 0) out.push({ label: "Best " + cols.productCol, value: agg[0].name, icon: Package, accent: "from-violet-500 to-fuchsia-500" });
    }
    out.push({ label: "Total Records", value: formatNum(filteredRows.length), icon: TrendingUp, accent: "from-slate-500 to-slate-700" });
    return out;
  }, [cols, filteredRows]);

  // Trend chart (line) — date + revenue
  const trendData = useMemo(() => {
    if (!cols.dateCols[0] || !cols.revenueCol) return null;
    const map = new Map<string, number>();
    for (const r of filteredRows) {
      const raw = r[cols.dateCols[0]];
      if (!raw) continue;
      const d = new Date(String(raw));
      const key = isNaN(d.getTime()) ? String(raw) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + (Number(r[cols.revenueCol!]) || 0));
    }
    return Array.from(map.entries())
      .map(([k, v]) => ({ period: k, value: Math.round(v * 100) / 100 }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }, [cols, filteredRows]);

  // Bar chart by category
  const barData = useMemo(() => {
    if (!cols.categoryCol || !cols.revenueCol) return null;
    return aggregateBy(filteredRows, cols.categoryCol, cols.revenueCol).slice(0, 10);
  }, [cols, filteredRows]);

  // Pie chart by region
  const pieData = useMemo(() => {
    if (!cols.regionCol || !cols.revenueCol) return null;
    return aggregateBy(filteredRows, cols.regionCol, cols.revenueCol).slice(0, 6);
  }, [cols, filteredRows]);

  // Filter columns: top 3 string cols with reasonable distinct counts
  const filterCols = useMemo(() => {
    return cols.stringCols
      .map((c) => {
        const set = new Set(data.rows.map((r) => String(r[c] ?? "")).filter(Boolean));
        return { name: c, options: Array.from(set).slice(0, 50), count: set.size };
      })
      .filter((f) => f.count >= 2 && f.count <= 50)
      .slice(0, 4);
  }, [cols, data]);

  const exportPDF = async () => {
    const el = document.getElementById("auto-dashboard-root");
    if (!el) return;
    toast.loading("Exporting dashboard…", { id: "auto-pdf" });
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");
      const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.width / canvas.height;
      let w = pageW - 10;
      let h = w / ratio;
      if (h > pageH - 10) { h = pageH - 10; w = h * ratio; }
      pdf.addImage(imgData, "PNG", (pageW - w) / 2, 5, w, h);
      pdf.save("auto-dashboard.pdf");
      toast.success("Dashboard exported!", { id: "auto-pdf" });
    } catch {
      toast.error("Export failed", { id: "auto-pdf" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Auto-Generated Dashboard</h2>
          <p className="text-sm text-muted-foreground">Smart visualizations built automatically from your dataset.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportPDF}>
          <FileDown className="h-4 w-4 mr-1" /> Export PDF
        </Button>
      </div>

      {/* Filters */}
      {filterCols.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {filterCols.map((f) => (
              <div key={f.name} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">{f.name}</label>
                <select
                  value={filters[f.name] ?? "__all__"}
                  onChange={(e) => setFilters((prev) => ({ ...prev, [f.name]: e.target.value }))}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm min-w-[140px]"
                >
                  <option value="__all__">All</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            ))}
            {Object.keys(filters).length > 0 && (
              <Button variant="ghost" size="sm" className="self-end" onClick={() => setFilters({})}>
                Clear all
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div id="auto-dashboard-root" className="space-y-6 bg-background p-2 rounded-lg">
        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <Card key={k.label} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br ${k.accent} text-white mb-3`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{k.label}</p>
                  <p className="text-xl font-bold text-foreground mt-1 truncate">{k.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trend (full width) */}
        {trendData && trendData.length > 1 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Trend over Time</CardTitle>
              <Badge variant="outline" className="w-fit text-[10px]">{cols.dateCols[0]} × {cols.revenueCol}</Badge>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={formatNum} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Bar + Pie side by side */}
        <div className="grid gap-4 lg:grid-cols-2">
          {barData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top {cols.categoryCol} by {cols.revenueCol}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={formatNum} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {pieData && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Distribution by {cols.regionCol}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => e.name}>
                      {pieData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Comparison: numeric column rankings */}
        {cols.numericCols.length >= 2 && cols.categoryCol && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Comparison Analysis</CardTitle>
              <Badge variant="outline" className="w-fit text-[10px]">{cols.numericCols.slice(0, 2).join(" vs ")}</Badge>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={(() => {
                    const map = new Map<string, Record<string, number>>();
                    for (const r of filteredRows) {
                      const k = String(r[cols.categoryCol!] ?? "Unknown");
                      if (!map.has(k)) map.set(k, {});
                      const e = map.get(k)!;
                      for (const nc of cols.numericCols.slice(0, 2)) {
                        e[nc] = (e[nc] || 0) + (Number(r[nc]) || 0);
                      }
                    }
                    return Array.from(map.entries())
                      .map(([name, vals]) => ({ name, ...vals }))
                      .sort((a, b) => (Number(b[cols.numericCols[0]]) || 0) - (Number(a[cols.numericCols[0]]) || 0))
                      .slice(0, 8);
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={formatNum} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {cols.numericCols.slice(0, 2).map((nc, i) => (
                    <Bar key={nc} dataKey={nc} fill={PALETTE[i]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}