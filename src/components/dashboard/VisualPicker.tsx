import {
  BarChart3, LineChart, PieChart, Activity, Hash, Table2,
  AreaChart, Radar, Triangle, LayoutGrid, Layers, Thermometer, Droplets, Gauge, Combine
} from "lucide-react";
import type { ChartType } from "@/lib/chart-types";

interface VisualPickerProps {
  onSelect: (type: ChartType) => void;
}

const visuals: { type: ChartType; label: string; icon: React.ElementType }[] = [
  { type: "bar", label: "Bar Chart", icon: BarChart3 },
  { type: "line", label: "Line Chart", icon: LineChart },
  { type: "pie", label: "Pie Chart", icon: PieChart },
  { type: "scatter", label: "Scatter Plot", icon: Activity },
  { type: "kpi", label: "KPI Card", icon: Hash },
  { type: "table", label: "Table", icon: Table2 },
  { type: "area", label: "Area Chart", icon: AreaChart },
  { type: "radar", label: "Radar Chart", icon: Radar },
  { type: "funnel", label: "Funnel", icon: Triangle },
  { type: "treemap", label: "Treemap", icon: LayoutGrid },
  { type: "histogram", label: "Histogram", icon: Layers },
  { type: "heatmap", label: "Heatmap", icon: Thermometer },
  { type: "waterfall", label: "Waterfall", icon: Droplets },
  { type: "gauge", label: "Gauge", icon: Gauge },
  { type: "combo", label: "Combo Chart", icon: Combine },
];

export default function VisualPicker({ onSelect }: VisualPickerProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Visualizations</h3>
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-15 gap-2">
        {visuals.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-background p-2.5 hover:border-primary hover:bg-primary/5 transition-colors group"
            title={label}
          >
            <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors leading-tight text-center">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
