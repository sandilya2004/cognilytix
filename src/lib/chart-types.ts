export type ChartType = "bar" | "line" | "pie" | "scatter" | "kpi" | "table";

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
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}
