export type ChartType =
  | "bar" | "line" | "pie" | "scatter" | "kpi" | "table"
  | "area" | "radar" | "funnel" | "treemap" | "histogram" | "heatmap"
  | "waterfall" | "gauge" | "combo"
  | "clustered-bar" | "clustered-column" | "stacked-bar" | "stacked-column"
  | "matrix" | "card" | "narrative" | "slicer" | "decomposition-tree"
  | "geo-map";

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  xKey?: string;
  yKey?: string;
  yKeys?: string[];
  data: Record<string, unknown>[];
  labelKey?: string;
  valueKey?: string;
  kpiValue?: string | number;
  kpiLabel?: string;
  kpiChange?: number;
  columns?: string[];
  sqlCode?: string;
  pythonCode?: string;
  narrativeText?: string;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}
