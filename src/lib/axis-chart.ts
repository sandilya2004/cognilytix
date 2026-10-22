import type { ChartConfig, ChartType } from "@/lib/chart-types";
import type { ParsedData } from "@/lib/data-processing";

/** Build a chart (or KPI card) config from X/Y columns over the given rows. */
export function buildAxisChart(
  data: ParsedData,
  rows: Record<string, unknown>[],
  xKeys: string[],
  yKeys: string[],
  chartType: ChartType,
  id = Math.random().toString(36).slice(2, 10),
): ChartConfig {
  if (chartType === "kpi" || chartType === "card") {
    const col = yKeys[0] ?? xKeys[0];
    const isNum = data.columns.find((c) => c.name === col)?.type === "number";
    const value = isNum
      ? rows.reduce((s, r) => s + (Number(r[col]) || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
      : new Set(rows.map((r) => String(r[col] ?? ""))).size.toLocaleString();
    const label = isNum ? `Total ${col}` : `Distinct ${col}`;
    return { id, type: chartType, title: label, kpiLabel: label, kpiValue: value, data: [] };
  }
  const multiX = xKeys.length > 1;
  const xKey = multiX ? xKeys.join(" / ") : xKeys[0];
  const src = multiX
    ? rows.map((r) => ({ ...r, [xKey]: xKeys.map((k) => String(r[k] ?? "Unknown")).join(" / ") }))
    : rows;
  const catCols = data.columns.filter((c) => c.type === "string" || c.type === "date").map((c) => c.name);
  const isCategory = multiX || catCols.includes(xKey);
  let chartData: Record<string, unknown>[];
  if (isCategory) {
    const map = new Map<string, Record<string, number>>();
    for (const r of src) {
      const k = String(r[xKey] ?? "Unknown");
      const e = map.get(k) || {};
      for (const yk of yKeys) e[yk] = (e[yk] || 0) + (Number(r[yk]) || 0);
      map.set(k, e);
    }
    chartData = Array.from(map.entries()).map(([k, v]) => {
      const o: Record<string, unknown> = { [xKey]: k };
      for (const yk of yKeys) o[yk] = Math.round((v[yk] || 0) * 100) / 100;
      return o;
    });
  } else {
    chartData = src.slice(0, 100);
  }
  if (chartType === "pie") chartData = chartData.slice(0, 10);
  return {
    id,
    type: chartType,
    title: `${yKeys.join(", ")} by ${xKey}`,
    xKey,
    yKey: yKeys[0],
    yKeys: yKeys.length > 1 ? yKeys : undefined,
    labelKey: xKey,
    valueKey: yKeys[0],
    data: chartData,
  };
}
