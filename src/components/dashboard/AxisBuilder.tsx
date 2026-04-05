import { useState } from "react";
import { GripVertical, X, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataColumn } from "@/lib/data-processing";
import type { ChartType } from "@/lib/chart-types";

interface AxisBuilderProps {
  columns: DataColumn[];
  onCreateChart: (xKey: string, yKeys: string[], chartType: ChartType) => void;
}

const chartOptions: { value: ChartType; label: string }[] = [
  { value: "bar", label: "Bar" },
  { value: "clustered-column", label: "Clustered Column" },
  { value: "stacked-column", label: "Stacked Column" },
  { value: "line", label: "Line" },
  { value: "area", label: "Area" },
  { value: "pie", label: "Pie" },
  { value: "scatter", label: "Scatter" },
  { value: "combo", label: "Combo" },
  { value: "radar", label: "Radar" },
  { value: "funnel", label: "Funnel" },
];

export default function AxisBuilder({ columns, onCreateChart }: AxisBuilderProps) {
  const [xAxis, setXAxis] = useState<string | null>(null);
  const [yAxes, setYAxes] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [draggedCol, setDraggedCol] = useState<string | null>(null);

  const handleDragStart = (colName: string) => {
    setDraggedCol(colName);
  };

  const handleDropX = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedCol) setXAxis(draggedCol);
    setDraggedCol(null);
  };

  const handleDropY = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedCol && !yAxes.includes(draggedCol)) {
      setYAxes(prev => [...prev, draggedCol]);
    }
    setDraggedCol(null);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleCreate = () => {
    if (!xAxis || yAxes.length === 0) return;
    onCreateChart(xAxis, yAxes, chartType);
  };

  const typeBadge: Record<string, string> = {
    number: "bg-primary/10 text-primary border-primary/20",
    string: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    date: "bg-accent/10 text-accent border-accent/20",
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 animate-fade-up">
      <h3 className="text-sm font-semibold text-foreground mb-3">Drag & Drop Axis Builder</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Columns */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Columns</p>
          <div className="space-y-1 max-h-[200px] overflow-y-auto rounded-md border border-border bg-background p-2">
            {columns.map(col => (
              <div
                key={col.name}
                draggable
                onDragStart={() => handleDragStart(col.name)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab hover:bg-muted/50 transition-colors active:cursor-grabbing"
              >
                <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                <span className="text-xs text-foreground truncate flex-1">{col.name}</span>
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 ${typeBadge[col.type] || ""}`}>
                  {col.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Drop Zones */}
        <div className="space-y-3">
          {/* X Axis */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">X-Axis (Category)</p>
            <div
              onDrop={handleDropX}
              onDragOver={handleDragOver}
              className={`min-h-[48px] rounded-md border-2 border-dashed p-2 flex items-center justify-center transition-colors ${
                draggedCol ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              {xAxis ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{xAxis}</Badge>
                  <button onClick={() => setXAxis(null)}>
                    <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Drop column here</p>
              )}
            </div>
          </div>

          {/* Y Axis */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Y-Axis (Values)</p>
            <div
              onDrop={handleDropY}
              onDragOver={handleDragOver}
              className={`min-h-[48px] rounded-md border-2 border-dashed p-2 transition-colors ${
                draggedCol ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              {yAxes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {yAxes.map(y => (
                    <div key={y} className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">{y}</Badge>
                      <button onClick={() => setYAxes(prev => prev.filter(v => v !== y))}>
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center">Drop column(s) here</p>
              )}
            </div>
          </div>
        </div>

        {/* Chart Type & Create */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Chart Type</p>
            <select
              value={chartType}
              onChange={e => setChartType(e.target.value as ChartType)}
              className="w-full text-xs rounded-md border border-border bg-background px-2 py-2 text-foreground"
            >
              {chartOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <Button
            className="w-full"
            size="sm"
            disabled={!xAxis || yAxes.length === 0}
            onClick={handleCreate}
          >
            <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
            Create Visual
          </Button>
        </div>
      </div>
    </div>
  );
}
