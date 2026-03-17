import type { ChartConfig } from "./chart-types";
import type { ParsedData } from "./data-processing";

export function generateSummary(charts: ChartConfig[], data: ParsedData): string {
  if (!data || charts.length === 0) return "";

  const lines: string[] = [];
  lines.push(`## Data Summary Report`);
  lines.push(`**Dataset:** ${data.rows.length} rows × ${data.columns.length} columns`);
  lines.push(`**Columns:** ${data.columns.map(c => `${c.name} (${c.type})`).join(", ")}`);
  lines.push("");

  // Overall numeric stats
  const numericCols = data.columns.filter(c => c.type === "number");
  if (numericCols.length > 0) {
    lines.push("### Key Metrics Overview");
    for (const col of numericCols.slice(0, 5)) {
      const values = data.rows.map(r => Number(r[col.name]) || 0);
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      lines.push(`- **${col.name}:** Total = ${sum.toLocaleString()}, Avg = ${avg.toFixed(2)}, Min = ${min.toLocaleString()}, Max = ${max.toLocaleString()}`);
    }
    lines.push("");
  }

  // Per-chart insights
  lines.push("### Visualization Insights");
  for (const chart of charts) {
    lines.push(`\n#### ${chart.title} (${chart.type})`);

    if (chart.type === "kpi") {
      lines.push(`- Key value: **${chart.kpiValue}** (${chart.kpiLabel})`);
      if (chart.kpiChange !== undefined) {
        lines.push(`- Change: ${chart.kpiChange >= 0 ? "+" : ""}${chart.kpiChange}%`);
      }
      continue;
    }

    if (chart.data.length > 0 && chart.xKey && chart.yKey) {
      const sorted = [...chart.data].sort((a, b) => (Number(b[chart.yKey!]) || 0) - (Number(a[chart.yKey!]) || 0));
      const top = sorted[0];
      const bottom = sorted[sorted.length - 1];
      if (top && bottom) {
        lines.push(`- **Top performer:** ${top[chart.xKey]} with ${Number(top[chart.yKey!]).toLocaleString()}`);
        lines.push(`- **Lowest:** ${bottom[chart.xKey]} with ${Number(bottom[chart.yKey!]).toLocaleString()}`);
      }
      const vals = chart.data.map(d => Number(d[chart.yKey!]) || 0);
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      lines.push(`- Average across ${chart.data.length} items: ${avg.toFixed(2)}`);

      // Trend detection for line/area
      if (chart.type === "line" || chart.type === "area") {
        const first = vals[0];
        const last = vals[vals.length - 1];
        if (last > first * 1.1) lines.push(`- 📈 **Upward trend** detected (${((last/first - 1)*100).toFixed(1)}% increase)`);
        else if (last < first * 0.9) lines.push(`- 📉 **Downward trend** detected (${((1 - last/first)*100).toFixed(1)}% decrease)`);
        else lines.push(`- ➡️ **Stable trend** — values relatively consistent`);
      }
    }
  }

  // Recommendations
  lines.push("\n### Business Recommendations");
  lines.push("Based on the data analysis:");

  if (numericCols.length > 0) {
    const mainCol = numericCols[0];
    const values = data.rows.map(r => Number(r[mainCol.name]) || 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min;
    if (range > max * 0.5) {
      lines.push(`- **High variance detected** in ${mainCol.name} (range: ${range.toLocaleString()}). Investigate the outliers and focus on consistency.`);
    }
    const belowAvg = values.filter(v => v < (max + min) / 2).length;
    if (belowAvg > values.length * 0.6) {
      lines.push(`- **Majority underperforming:** ${((belowAvg/values.length)*100).toFixed(0)}% of entries are below the midpoint. Focus resources on improvement.`);
    }
  }

  lines.push("- Review top and bottom performers to identify best practices and areas needing attention.");
  lines.push("- Consider deeper analysis on time-based trends if temporal data is available.");

  return lines.join("\n");
}
