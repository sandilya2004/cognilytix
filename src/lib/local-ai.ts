import type { DataColumn } from "./data-processing";
import type { ChartConfig, ChartType } from "./chart-types";
import { generateId } from "./chart-types";

/**
 * Local prompt interpreter — parses natural language into chart configs
 * without requiring an AI backend. Works as a fallback.
 */

function fuzzyMatch(input: string, candidates: string[]): string | undefined {
  const lower = input.toLowerCase();
  // exact
  const exact = candidates.find((c) => lower.includes(c.toLowerCase()));
  if (exact) return exact;
  // partial
  return candidates.find((c) => {
    const words = c.toLowerCase().split(/[\s_]+/);
    return words.some((w) => w.length > 2 && lower.includes(w));
  });
}

function detectChartType(prompt: string): ChartType {
  const p = prompt.toLowerCase();
  if (p.includes("pie") || p.includes("donut") || p.includes("distribution") || p.includes("proportion")) return "pie";
  if (p.includes("line") || p.includes("trend") || p.includes("over time") || p.includes("timeline")) return "line";
  if (p.includes("scatter") || p.includes("correlation") || p.includes("vs")) return "scatter";
  if (p.includes("kpi") || p.includes("total") || p.includes("average") || p.includes("sum") || p.includes("count")) return "kpi";
  if (p.includes("table") || p.includes("summary") || p.includes("top")) return "table";
  return "bar";
}

function aggregateData(
  rows: Record<string, unknown>[],
  groupKey: string,
  valueKey: string,
  agg: "sum" | "avg" | "count" = "sum"
): Record<string, unknown>[] {
  const map = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const key = String(row[groupKey] ?? "Unknown");
    const val = Number(row[valueKey]) || 0;
    const curr = map.get(key) || { sum: 0, count: 0 };
    curr.sum += val;
    curr.count += 1;
    map.set(key, curr);
  }
  return Array.from(map.entries()).map(([k, v]) => ({
    [groupKey]: k,
    [valueKey]: agg === "avg" ? Math.round(v.sum / v.count * 100) / 100 : agg === "count" ? v.count : Math.round(v.sum * 100) / 100,
  }));
}

export function interpretPrompt(
  prompt: string,
  columns: DataColumn[],
  rows: Record<string, unknown>[]
): ChartConfig {
  const chartType = detectChartType(prompt);
  const p = prompt.toLowerCase();

  const numericCols = columns.filter((c) => c.type === "number").map((c) => c.name);
  const stringCols = columns.filter((c) => c.type === "string" || c.type === "date").map((c) => c.name);

  // Try to find referenced columns
  const allNames = columns.map((c) => c.name);
  const mentioned = allNames.filter((n) => p.includes(n.toLowerCase()));

  let xKey = mentioned.find((m) => stringCols.includes(m)) ?? fuzzyMatch(prompt, stringCols) ?? stringCols[0];
  let yKey = mentioned.find((m) => numericCols.includes(m)) ?? fuzzyMatch(prompt, numericCols) ?? numericCols[0];

  if (!xKey) xKey = allNames[0];
  if (!yKey) yKey = allNames[1] ?? allNames[0];

  // "top N" handling
  const topMatch = p.match(/top\s+(\d+)/);
  const topN = topMatch ? parseInt(topMatch[1]) : undefined;

  if (chartType === "kpi") {
    const values = rows.map((r) => Number(r[yKey]) || 0);
    let kpiValue: number;
    let kpiLabel: string;

    if (p.includes("average") || p.includes("avg")) {
      kpiValue = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
      kpiLabel = `Average ${yKey}`;
    } else if (p.includes("count")) {
      kpiValue = rows.length;
      kpiLabel = `Total records`;
    } else {
      kpiValue = Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
      kpiLabel = `Total ${yKey}`;
    }

    return {
      id: generateId(),
      type: "kpi",
      title: kpiLabel,
      data: [],
      kpiValue: kpiValue.toLocaleString(),
      kpiLabel,
    };
  }

  if (chartType === "table") {
    const cols = mentioned.length > 0 ? mentioned : allNames.slice(0, 5);
    let tableData = rows;
    if (topN && numericCols.includes(yKey)) {
      tableData = [...rows]
        .sort((a, b) => (Number(b[yKey]) || 0) - (Number(a[yKey]) || 0))
        .slice(0, topN);
    } else if (topN) {
      tableData = rows.slice(0, topN);
    }
    return {
      id: generateId(),
      type: "table",
      title: topN ? `Top ${topN} by ${yKey}` : "Data Summary",
      data: tableData.slice(0, 50),
      columns: cols,
    };
  }

  // For chart types: aggregate if grouping makes sense
  let chartData: Record<string, unknown>[];
  if (stringCols.includes(xKey) && numericCols.includes(yKey)) {
    chartData = aggregateData(rows, xKey, yKey, p.includes("average") || p.includes("avg") ? "avg" : "sum");
  } else {
    chartData = rows.slice(0, 100);
  }

  if (topN) {
    chartData = [...chartData]
      .sort((a, b) => (Number(b[yKey]) || 0) - (Number(a[yKey]) || 0))
      .slice(0, topN);
  }

  // Limit pie to 10 slices
  if (chartType === "pie") {
    chartData = chartData.slice(0, 10);
  }

  const title = prompt.charAt(0).toUpperCase() + prompt.slice(1);

  return {
    id: generateId(),
    type: chartType,
    title,
    xKey,
    yKey,
    labelKey: xKey,
    valueKey: yKey,
    data: chartData,
  };
}
