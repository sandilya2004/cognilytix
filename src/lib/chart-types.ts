export type ChartType = "bar" | "line" | "pie" | "scatter" | "kpi" | "table" | "area" | "radar" | "funnel" | "treemap" | "histogram" | "heatmap" | "waterfall" | "gauge" | "combo";

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  xKey?: string;
  yKey?: string;
  data: Record<string, unknown>[];
  labelKey?: string;
  valueKey?: string;
  kpiValue?: string | number;
  kpiLabel?: string;
  kpiChange?: number;
  columns?: string[];
  sqlCode?: string;
  pythonCode?: string;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}
