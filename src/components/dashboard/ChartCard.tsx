import { X, Download, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChartConfig } from "@/lib/chart-types";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import html2canvas from "html2canvas";
import { useRef } from "react";

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
}

export default function ChartCard({ config, onRemove }: ChartCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleExportPNG = async () => {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, { backgroundColor: "#ffffff" });
    const link = document.createElement("a");
    link.download = `${config.title.replace(/\s+/g, "_")}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const renderChart = () => {
    switch (config.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={config.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey={config.xKey} tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
              <Tooltip />
              <Bar dataKey={config.yKey!} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={config.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey={config.xKey} tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
              <Tooltip />
              <Line type="monotone" dataKey={config.yKey!} stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={config.data}
                dataKey={config.valueKey!}
                nameKey={config.labelKey!}
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {config.data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey={config.xKey} tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" name={config.xKey} />
              <YAxis dataKey={config.yKey} tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" name={config.yKey} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={config.data} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case "kpi":
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
                {config.data.slice(0, 20).map((row, i) => (
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
      default:
        return <p className="text-muted-foreground text-center py-10">Unsupported chart type</p>;
    }
  };

  return (
    <div ref={ref} className="rounded-lg border border-border bg-card overflow-hidden animate-fade-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h4 className="font-medium text-foreground text-sm">{config.title}</h4>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExportPNG} title="Export as PNG">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(config.id)} title="Remove">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="p-4">{renderChart()}</div>
    </div>
  );
}
