import type { DataColumn } from "./data-processing";
import type { ChartConfig, ChartType } from "./chart-types";
import { generateId } from "./chart-types";

function fuzzyMatch(input: string, candidates: string[]): string | undefined {
  const lower = input.toLowerCase();
  const exact = candidates.find((c) => lower.includes(c.toLowerCase()));
  if (exact) return exact;
  return candidates.find((c) => {
    const words = c.toLowerCase().split(/[\s_]+/);
    return words.some((w) => w.length > 2 && lower.includes(w));
  });
}

function detectChartType(prompt: string): ChartType {
  const p = prompt.toLowerCase();
  if (p.includes("stacked column")) return "stacked-column";
  if (p.includes("stacked bar")) return "stacked-bar";
  if (p.includes("clustered column")) return "clustered-column";
  if (p.includes("clustered bar")) return "clustered-bar";
  if (p.includes("decomposition") || p.includes("decomp")) return "decomposition-tree";
  if (p.includes("narrative") || p.includes("story")) return "narrative";
  if (p.includes("slicer") || p.includes("filter")) return "slicer";
  if (p.includes("matrix")) return "matrix";
  if (p.includes("card") && !p.includes("kpi")) return "card";
  if (p.includes("pie") || p.includes("donut") || p.includes("distribution") || p.includes("proportion")) return "pie";
  if (p.includes("line") || p.includes("trend") || p.includes("over time") || p.includes("timeline")) return "line";
  if (p.includes("scatter") || p.includes("correlation") || p.includes("vs")) return "scatter";
  if (p.includes("area")) return "area";
  if (p.includes("radar") || p.includes("spider")) return "radar";
  if (p.includes("funnel")) return "funnel";
  if (p.includes("treemap") || p.includes("tree map")) return "treemap";
  if (p.includes("histogram")) return "histogram";
  if (p.includes("heatmap") || p.includes("heat map")) return "heatmap";
  if (p.includes("waterfall")) return "waterfall";
  if (p.includes("gauge") || p.includes("meter")) return "gauge";
  if (p.includes("combo") || p.includes("combined")) return "combo";
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

function generateSQL(config: ChartConfig, tableName: string = "dataset"): string {
  const { type, xKey, yKey, kpiLabel } = config;

  if (type === "kpi") {
    if (kpiLabel?.includes("Average")) {
      return `SELECT ROUND(AVG(${yKey}), 2) AS avg_${yKey}\nFROM ${tableName};`;
    }
    if (kpiLabel?.includes("Total records")) {
      return `SELECT COUNT(*) AS total_records\nFROM ${tableName};`;
    }
    return `SELECT ROUND(SUM(${yKey}), 2) AS total_${yKey}\nFROM ${tableName};`;
  }

  if (type === "table") {
    const cols = config.columns?.join(", ") || "*";
    return `SELECT ${cols}\nFROM ${tableName}\nORDER BY ${yKey || "1"} DESC\nLIMIT 50;`;
  }

  // Chart types
  const aggFunc = kpiLabel?.includes("avg") ? "AVG" : "SUM";
  return `SELECT ${xKey},\n       ROUND(${aggFunc}(${yKey}), 2) AS ${yKey}\nFROM ${tableName}\nGROUP BY ${xKey}\nORDER BY ${yKey} DESC;`;
}

function generatePython(config: ChartConfig): string {
  const { type, xKey, yKey, kpiLabel } = config;
  const lines: string[] = ["import pandas as pd", "import matplotlib.pyplot as plt", "", "df = pd.read_csv('dataset.csv')", ""];

  if (type === "kpi") {
    if (kpiLabel?.includes("Average")) {
      lines.push(`result = df['${yKey}'].mean()`, `print(f"Average ${yKey}: {result:.2f}")`);
    } else if (kpiLabel?.includes("Total records")) {
      lines.push(`result = len(df)`, `print(f"Total records: {result}")`);
    } else {
      lines.push(`result = df['${yKey}'].sum()`, `print(f"Total ${yKey}: {result:.2f}")`);
    }
    return lines.join("\n");
  }

  if (type === "table") {
    const cols = config.columns?.map(c => `'${c}'`).join(", ") || "";
    lines.push(`top_data = df[[${cols}]].sort_values('${yKey}', ascending=False).head(50)`, `print(top_data.to_string())`);
    return lines.join("\n");
  }

  lines.push(`grouped = df.groupby('${xKey}')['${yKey}'].sum().sort_values(ascending=False)`, "");

  switch (type) {
    case "bar":
      lines.push(`grouped.plot(kind='bar', figsize=(10, 6), color='#6366f1')`, `plt.title('${config.title}')`, `plt.xlabel('${xKey}')`, `plt.ylabel('${yKey}')`, `plt.xticks(rotation=45)`, `plt.tight_layout()`, `plt.show()`);
      break;
    case "line":
    case "area":
      lines.push(`grouped.plot(kind='${type === "area" ? "area" : "line"}', figsize=(10, 6), color='#6366f1')`, `plt.title('${config.title}')`, `plt.xlabel('${xKey}')`, `plt.ylabel('${yKey}')`, `plt.tight_layout()`, `plt.show()`);
      break;
    case "pie":
      lines.push(`grouped.head(10).plot(kind='pie', figsize=(8, 8), autopct='%1.0f%%')`, `plt.title('${config.title}')`, `plt.ylabel('')`, `plt.show()`);
      break;
    case "scatter":
      lines.push(`plt.figure(figsize=(10, 6))`, `plt.scatter(df['${xKey}'], df['${yKey}'], alpha=0.6, color='#6366f1')`, `plt.title('${config.title}')`, `plt.xlabel('${xKey}')`, `plt.ylabel('${yKey}')`, `plt.tight_layout()`, `plt.show()`);
      break;
    default:
      lines.push(`grouped.plot(kind='bar', figsize=(10, 6))`, `plt.title('${config.title}')`, `plt.tight_layout()`, `plt.show()`);
  }

  return lines.join("\n");
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

  const allNames = columns.map((c) => c.name);
  const mentioned = allNames.filter((n) => p.includes(n.toLowerCase()));

  let xKey = mentioned.find((m) => stringCols.includes(m)) ?? fuzzyMatch(prompt, stringCols) ?? stringCols[0];
  let yKey = mentioned.find((m) => numericCols.includes(m)) ?? fuzzyMatch(prompt, numericCols) ?? numericCols[0];

  if (!xKey) xKey = allNames[0];
  if (!yKey) yKey = allNames[1] ?? allNames[0];

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

    const cfg: ChartConfig = {
      id: generateId(),
      type: "kpi",
      title: kpiLabel,
      data: [],
      xKey,
      yKey,
      kpiValue: kpiValue.toLocaleString(),
      kpiLabel,
    };
    cfg.sqlCode = generateSQL(cfg);
    cfg.pythonCode = generatePython(cfg);
    return cfg;
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
    const cfg: ChartConfig = {
      id: generateId(),
      type: "table",
      title: topN ? `Top ${topN} by ${yKey}` : "Data Summary",
      data: tableData.slice(0, 50),
      xKey,
      yKey,
      columns: cols,
    };
    cfg.sqlCode = generateSQL(cfg);
    cfg.pythonCode = generatePython(cfg);
    return cfg;
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

  if (chartType === "pie") {
    chartData = chartData.slice(0, 10);
  }

  const title = prompt.charAt(0).toUpperCase() + prompt.slice(1);

  const cfg: ChartConfig = {
    id: generateId(),
    type: chartType,
    title,
    xKey,
    yKey,
    labelKey: xKey,
    valueKey: yKey,
    data: chartData,
  };
  cfg.sqlCode = generateSQL(cfg);
  cfg.pythonCode = generatePython(cfg);
  return cfg;
}

/** Create a chart from a visual type picker click (auto-selects best columns) */
export function createFromType(
  type: ChartType,
  columns: DataColumn[],
  rows: Record<string, unknown>[]
): ChartConfig {
  const typePromptMap: Record<string, string> = {
    bar: "Create a bar chart",
    line: "Show a line chart trend",
    pie: "Show distribution as pie chart",
    scatter: "Create a scatter plot",
    kpi: "Show total as KPI",
    table: "Show data summary table",
    area: "Create an area chart",
    radar: "Create a radar chart",
    funnel: "Create a funnel chart",
    treemap: "Create a treemap",
    histogram: "Create a histogram",
    heatmap: "Create a heatmap",
    waterfall: "Create a waterfall chart",
    gauge: "Create a gauge chart",
    combo: "Create a combo chart",
  };
  const prompt = typePromptMap[type] || "Create a bar chart";
  return interpretPrompt(prompt, columns, rows);
}
