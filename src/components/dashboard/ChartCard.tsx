import { X, Download, TrendingUp, TrendingDown, Code, Database, MessageSquareText, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChartConfig } from "@/lib/chart-types";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart,
} from "recharts";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const COLORS = [
  "hsl(239, 84%, 67%)",
  "hsl(160, 84%, 39%)",
  "hsl(32, 95%, 44%)",
  "hsl(280, 65%, 60%)",
  "hsl(190, 80%, 45%)",
  "hsl(350, 70%, 55%)",
];

interface ChartCardProps {
  config: ChartConfig;
  onRemove: (id: string) => void;
  onTitleChange?: (id: string, newTitle: string) => void;
  filteredData?: Record<string, unknown>[] | null;
  slicerFilters?: Record<string, Set<string>>;
  onSlicerToggle?: (columnKey: string, value: string) => void;
  sortable?: boolean;
}

export default function ChartCard({ config, onRemove, onTitleChange, filteredData, slicerFilters, onSlicerToggle, sortable }: ChartCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [showCode, setShowCode] = useState<"none" | "sql" | "python">("none");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(config.title);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: config.id, disabled: !sortable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const generateExplanation = async () => {
    if (explanation) { setExplanation(null); return; }
    setExplaining(true);
    try {
      const sampleData = config.data.slice(0, 10);
      const { data: aiData, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [
            {
              role: "user",
              content: `Explain this ${config.type} chart titled "${config.title}" in 2-3 sentences. X-axis: ${config.xKey}, Y-axis: ${config.yKey}. Sample data: ${JSON.stringify(sampleData)}`,
            },
          ],
          context: `Chart type: ${config.type}, Title: ${config.title}, Data points: ${config.data.length}`,
        },
      });
      if (error) throw error;
      setExplanation(aiData?.response || "Unable to generate explanation.");
    } catch {
      const { type, title, xKey, yKey, data: chartData, kpiValue, kpiLabel } = config;
      let text = "";
      if (type === "kpi" || type === "card") {
        text = `This KPI card shows that the **${kpiLabel}** is **${kpiValue}**.`;
      } else if (type === "pie") {
        text = `This pie chart shows the distribution of **${yKey}** across **${xKey}** categories.`;
      } else {
        const topVal = [...chartData].sort((a, b) => (Number(b[yKey!]) || 0) - (Number(a[yKey!]) || 0))[0];
        text = `"${title}" compares **${yKey}** across **${xKey}**. **${topVal?.[xKey!]}** leads with the highest value.`;
      }
      setExplanation(text);
    } finally {
      setExplaining(false);
    }
  };

  const handleExportPNG = async () => {
    if (!ref.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(ref.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const link = document.createElement("a");
    link.download = `${config.title.replace(/\s+/g, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const saveTitle = () => {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== config.title) {
      onTitleChange?.(config.id, trimmed);
    } else {
      setTitleDraft(config.title);
    }
  };

  const renderChart = () => {
    const { type, xKey, yKey, yKeys } = config;
    const data = (type !== "slicer" && filteredData) ? filteredData : config.data;

    switch (type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
              <Tooltip />
              <Bar dataKey={yKey!} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "clustered-column":
      case "clustered-bar": {
        const keys = yKeys?.length ? yKeys : [yKey!];
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} layout={type === "clustered-bar" ? "vertical" : "horizontal"}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              {type === "clustered-bar" ? (
                <>
                  <YAxis dataKey={xKey} type="category" tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" width={80} />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
                </>
              ) : (
                <>
                  <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
                </>
              )}
              <Tooltip />
              <Legend />
              {keys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case "stacked-column":
      case "stacked-bar": {
        const keys = yKeys?.length ? yKeys : [yKey!];
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} layout={type === "stacked-bar" ? "vertical" : "horizontal"}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              {type === "stacked-bar" ? (
                <>
                  <YAxis dataKey={xKey} type="category" tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" width={80} />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
                </>
              ) : (
                <>
                  <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
                </>
              )}
              <Tooltip />
              <Legend />
              {keys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} stackId="stack" radius={i === keys.length - 1 ? [4, 4, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case "line":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
              <Tooltip />
              <Line type="monotone" dataKey={yKey!} stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
              <Tooltip />
              <Area type="monotone" dataKey={yKey!} stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "pie": {
        const RADIAN = Math.PI / 180;
        const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
          const radius = outerRadius + 20;
          const x = cx + radius * Math.cos(-midAngle * RADIAN);
          const y = cy + radius * Math.sin(-midAngle * RADIAN);
          if (percent < 0.03) return null;
          return (
            <text x={x} y={y} fill="hsl(220, 9%, 46%)" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11}>
              {`${name} (${(percent * 100).toFixed(1)}%)`}
            </text>
          );
        };
        return (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={data}
                dataKey={config.valueKey!}
                nameKey={config.labelKey!}
                cx="50%"
                cy="45%"
                outerRadius={85}
                innerRadius={30}
                paddingAngle={2}
                label={renderCustomLabel}
                labelLine={{ stroke: "hsl(220, 13%, 80%)", strokeWidth: 1 }}
              >
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(value: number) => value.toLocaleString()} />
              <Legend layout="horizontal" align="center" verticalAlign="bottom" iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" name={xKey} />
              <YAxis dataKey={yKey} tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" name={yKey} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={data} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case "radar":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={data.slice(0, 12)}>
              <PolarGrid />
              <PolarAngleAxis dataKey={xKey} tick={{ fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
              <Radar dataKey={yKey!} stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        );

      case "combo":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
              <Tooltip />
              <Bar dataKey={yKey!} fill={COLORS[0]} radius={[4, 4, 0, 0]} opacity={0.7} />
              <Line type="monotone" dataKey={yKey!} stroke={COLORS[1]} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case "kpi":
      case "card":
        return (
          <div className="flex flex-col items-center justify-center h-[200px] gap-2">
            <p className="text-sm text-muted-foreground">{config.kpiLabel}</p>
            <p className="text-4xl font-bold text-foreground">{config.kpiValue}</p>
            {config.kpiChange !== undefined && (
              <div className={`flex items-center gap-1 text-sm ${config.kpiChange >= 0 ? "text-accent" : "text-destructive"}`}>
                {config.kpiChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {config.kpiChange >= 0 ? "+" : ""}{config.kpiChange}%
              </div>
            )}
          </div>
        );

      case "table":
      case "matrix":
        return (
          <div className="overflow-x-auto max-h-[280px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {(config.columns ?? []).map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-medium text-foreground">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-b border-border">
                    {(config.columns ?? []).map((col) => (
                      <td key={col} className="px-3 py-1.5 text-muted-foreground">{row[col] != null ? String(row[col]) : "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "narrative":
        return (
          <div className="p-4 text-sm text-muted-foreground leading-relaxed max-h-[280px] overflow-y-auto">
            {config.narrativeText || `Analysis of ${config.yKey}: The data contains ${data.length} data points.`}
          </div>
        );

      case "slicer": {
        const uniqueVals = [...new Set(config.data.map(d => String(d[config.xKey!])))].slice(0, 30);
        const activeSet = slicerFilters?.[config.xKey!];
        return (
          <div className="p-4 max-h-[280px] overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-2">Filter by {config.xKey}:</p>
            <div className="flex flex-wrap gap-2">
              {uniqueVals.map(val => {
                const isActive = activeSet?.has(val);
                return (
                  <span
                    key={val}
                    onClick={() => onSlicerToggle?.(config.xKey!, val)}
                    className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-background hover:bg-primary/10 hover:border-primary"
                    }`}
                  >
                    {val}
                  </span>
                );
              })}
            </div>
            {activeSet && activeSet.size > 0 && (
              <button className="text-xs text-primary mt-2 underline" onClick={() => activeSet.forEach(v => onSlicerToggle?.(config.xKey!, v))}>
                Clear filters
              </button>
            )}
          </div>
        );
      }

      case "decomposition-tree":
        return (
          <div className="p-4 max-h-[280px] overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-3">Decomposition of {config.yKey} by {config.xKey}</p>
            {data.slice(0, 8).map((row, i) => (
              <div key={i} className="flex items-center gap-2 mb-1.5">
                <div className="h-0.5 bg-primary/30" style={{ width: `${12 + i * 8}px` }} />
                <span className="text-xs text-foreground font-medium">{String(row[config.xKey!])}</span>
                <span className="text-xs text-muted-foreground">— {Number(row[config.yKey!]).toLocaleString()}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(100, (Number(row[config.yKey!]) / Math.max(...data.map(d => Number(d[config.yKey!]) || 1))) * 100)}%`,
                    backgroundColor: COLORS[i % COLORS.length],
                  }} />
                </div>
              </div>
            ))}
          </div>
        );

      case "funnel": {
        const sorted = [...data].sort((a, b) => (Number(b[config.yKey!]) || 0) - (Number(a[config.yKey!]) || 0)).slice(0, 6);
        const maxVal = Math.max(...sorted.map(d => Number(d[config.yKey!]) || 1));
        return (
          <div className="flex flex-col items-center justify-center h-[280px] px-4 gap-1">
            {sorted.map((row, i) => {
              const val = Number(row[config.yKey!]) || 0;
              const pct = val / maxVal;
              return (
                <div key={i} className="flex items-center gap-2 w-full transition-all" style={{ maxWidth: `${40 + pct * 60}%` }}>
                  <div
                    className="flex-1 text-center py-2.5 text-xs font-medium text-primary-foreground"
                    style={{
                      backgroundColor: COLORS[i % COLORS.length],
                      clipPath: i < sorted.length - 1
                        ? "polygon(4% 0%, 96% 0%, 100% 100%, 0% 100%)"
                        : "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
                      borderRadius: i === 0 ? "6px 6px 0 0" : i === sorted.length - 1 ? "0 0 6px 6px" : undefined,
                    }}
                  >
                    {String(row[config.xKey!])} — {val.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }

      case "treemap":
        return (
          <div className="grid grid-cols-3 gap-1 h-[280px] p-2">
            {data.slice(0, 9).map((row, i) => {
              const val = Number(row[config.yKey!]) || 1;
              const maxVal = Math.max(...data.slice(0, 9).map(d => Number(d[config.yKey!]) || 1));
              return (
                <div key={i} className="rounded flex flex-col items-center justify-center text-primary-foreground text-xs p-2"
                  style={{ backgroundColor: COLORS[i % COLORS.length], opacity: 0.5 + (val / maxVal) * 0.5 }}>
                  <span className="font-medium">{String(row[config.xKey!])}</span>
                  <span>{val.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        );

      case "histogram":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
              <Tooltip />
              <Bar dataKey={yKey!} fill={COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "heatmap":
        return (
          <div className="grid gap-1 p-4" style={{ gridTemplateColumns: `repeat(${Math.min(data.length, 8)}, 1fr)` }}>
            {data.slice(0, 24).map((row, i) => {
              const val = Number(row[config.yKey!]) || 0;
              const maxVal = Math.max(...data.map(d => Number(d[config.yKey!]) || 1));
              const intensity = val / maxVal;
              return (
                <div key={i} className="rounded aspect-square flex items-center justify-center text-[10px] text-primary-foreground"
                  style={{ backgroundColor: `hsl(239, 84%, ${70 - intensity * 40}%)` }} title={`${row[config.xKey!]}: ${val}`}>
                  {val.toFixed(0)}
                </div>
              );
            })}
          </div>
        );

      case "waterfall":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
              <Tooltip />
              <Bar dataKey={yKey!} fill={COLORS[0]} radius={[4, 4, 0, 0]}>
                {data.map((row, i) => (
                  <Cell key={i} fill={Number(row[yKey!]) >= 0 ? COLORS[1] : COLORS[5]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case "gauge": {
        const val = data.length > 0 ? Number(data[0][config.yKey!]) || 0 : 0;
        const maxVal = Math.max(...data.map(d => Number(d[config.yKey!]) || 1));
        const pct = Math.min(1, val / maxVal);
        return (
          <div className="flex flex-col items-center justify-center h-[200px]">
            <div className="relative w-36 h-20 overflow-hidden">
              <div className="absolute inset-0 rounded-t-full border-[12px] border-muted" />
              <div className="absolute inset-0 rounded-t-full border-[12px] border-transparent" style={{
                borderTopColor: COLORS[0], borderLeftColor: pct > 0.25 ? COLORS[0] : "transparent",
                borderRightColor: pct > 0.75 ? COLORS[0] : "transparent",
                transform: `rotate(${-90 + pct * 180}deg)`, transformOrigin: "bottom center",
              }} />
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">{val.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{(pct * 100).toFixed(0)}% of max</p>
          </div>
        );
      }

      default:
        return <p className="text-muted-foreground text-center py-10">Unsupported chart type</p>;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-card overflow-hidden animate-fade-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          {sortable && (
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0">
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          {editingTitle ? (
            <input
              autoFocus
              className="font-medium text-foreground text-sm bg-transparent border-b border-primary outline-none w-full"
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitleDraft(config.title); setEditingTitle(false); } }}
            />
          ) : (
            <h4
              className="font-medium text-foreground text-sm truncate cursor-pointer hover:text-primary transition-colors"
              onClick={() => { setTitleDraft(config.title); setEditingTitle(true); }}
              title="Click to edit title"
            >
              {config.title}
            </h4>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={generateExplanation} title="Explain">
            <MessageSquareText className={`h-3.5 w-3.5 ${explanation ? "text-primary" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCode(showCode === "sql" ? "none" : "sql")} title="SQL Code">
            <Database className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCode(showCode === "python" ? "none" : "python")} title="Python Code">
            <Code className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExportPNG} title="Export as PNG">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(config.id)} title="Remove">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {explaining && (
        <div className="px-4 py-2 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-xs text-muted-foreground">Getting AI explanation...</p>
          </div>
        </div>
      )}
      {explanation && (
        <div className="px-4 py-3 border-b border-border bg-primary/5">
          <p className="text-xs text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: explanation.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
        </div>
      )}
      {showCode !== "none" && config.sqlCode && config.pythonCode && (
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              {showCode === "sql" ? "SQL" : "Python"}
            </span>
            <button onClick={() => navigator.clipboard.writeText(showCode === "sql" ? config.sqlCode! : config.pythonCode!)} className="text-xs text-primary hover:underline">
              Copy
            </button>
          </div>
          <pre className="text-xs text-muted-foreground bg-background rounded p-3 overflow-x-auto whitespace-pre-wrap font-mono">
            {showCode === "sql" ? config.sqlCode : config.pythonCode}
          </pre>
        </div>
      )}
      <div ref={ref} className="p-4">{renderChart()}</div>
    </div>
  );
}
