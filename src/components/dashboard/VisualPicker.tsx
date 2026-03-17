import {
  BarChart3, LineChart, PieChart, Activity, Hash, Table2,
  AreaChart, Radar, Triangle, LayoutGrid, Layers, Thermometer,
  Droplets, Gauge, Combine, Columns3, BarChart2, AlignLeft,
  Filter, Image, GitBranch, MessageSquare, Grid3X3, FileCode, CreditCard, BookOpen,
} from "lucide-react";
import type { ChartType } from "@/lib/chart-types";

interface VisualPickerProps {
  onSelect: (type: ChartType) => void;
}

const visuals: { type: ChartType; label: string; icon: React.ElementType }[] = [
  { type: "bar", label: "Bar Chart", icon: BarChart3 },
  { type: "clustered-column", label: "Clustered Column", icon: Columns3 },
  { type: "clustered-bar", label: "Clustered Bar", icon: BarChart2 },
  { type: "stacked-column", label: "Stacked Column", icon: Layers },
  { type: "stacked-bar", label: "Stacked Bar", icon: AlignLeft },
  { type: "line", label: "Line Chart", icon: LineChart },
  { type: "area", label: "Area Chart", icon: AreaChart },
  { type: "pie", label: "Pie Chart", icon: PieChart },
  { type: "scatter", label: "Scatter Plot", icon: Activity },
  { type: "combo", label: "Combo Chart", icon: Combine },
  { type: "kpi", label: "KPI Card", icon: Hash },
  { type: "card", label: "Card", icon: CreditCard },
  { type: "table", label: "Table", icon: Table2 },
  { type: "matrix", label: "Matrix", icon: Grid3X3 },
  { type: "radar", label: "Radar", icon: Radar },
  { type: "funnel", label: "Funnel", icon: Triangle },
  { type: "treemap", label: "Treemap", icon: LayoutGrid },
  { type: "histogram", label: "Histogram", icon: Layers },
  { type: "heatmap", label: "Heatmap", icon: Thermometer },
  { type: "waterfall", label: "Waterfall", icon: Droplets },
  { type: "gauge", label: "Gauge", icon: Gauge },
  { type: "slicer", label: "Slicer", icon: Filter },
  { type: "narrative", label: "Narrative", icon: BookOpen },
  { type: "decomposition-tree", label: "Decomp Tree", icon: GitBranch },
];

export default function VisualPicker({ onSelect }: VisualPickerProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Visualizations</h3>
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
        {visuals.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-background p-2 hover:border-primary hover:bg-primary/5 transition-colors group"
            title={label}
          >
            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-[9px] text-muted-foreground group-hover:text-primary transition-colors leading-tight text-center line-clamp-2">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
