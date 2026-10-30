import { parsedRows } from "@/lib/data-processing";
import { calculateDatasetTotals } from "@/lib/report-data";
import type { ReportPayload } from "@/lib/export-pdf";

export const DEMO_FILE_NAME = "synthetic-retail-demo.csv";
export const DEMO_NOTICE = "Synthetic demonstration only — not real customers, transactions or business results.";

// Generated from fixed formulas, never loaded from account or customer storage.
export function createRetailDemo() {
  const regions = ["North", "South", "West"];
  const categories = ["Home", "Electronics", "Clothing", "Sports"];
  const rows = Array.from({ length: 72 }, (_, index) => {
    const month = Math.floor(index / 12);
    const category = index % 4;
    const units = 12 + month * 2 + category * 3;
    const sales = units * [40, 85, 30, 55][category];
    return {
      "Order Date": `2026-${String(month + 1).padStart(2, "0")}-${String(index % 12 + 1).padStart(2, "0")}`,
      Region: index === 0 ? null : regions[Math.floor(index / 4) % 3],
      Category: categories[category],
      Channel: index % 2 === 0 ? "Online" : "Store",
      Sales: sales,
      Profit: Math.round(sales * [0.22, 0.16, 0.28, 0.2][category]),
      Units: units,
    };
  });
  return parsedRows(["Order Date", "Region", "Category", "Channel", "Sales", "Profit", "Units"], rows);
}

export function createRetailDemoReport(): ReportPayload {
  const data = createRetailDemo();
  const { numericTotals } = calculateDatasetTotals(data);
  const sales = numericTotals.Sales;
  const profit = numericTotals.Profit;
  const categorySales = new Map<string, number>();
  const monthlySales = new Map<string, number>();
  for (const row of data.rows) {
    const category = String(row.Category);
    const month = String(row["Order Date"]).slice(0, 7);
    categorySales.set(category, (categorySales.get(category) ?? 0) + Number(row.Sales));
    monthlySales.set(month, (monthlySales.get(month) ?? 0) + Number(row.Sales));
  }
  const top = [...categorySales.entries()].sort((a, b) => b[1] - a[1])[0];
  const first = monthlySales.get("2026-01") ?? 0;
  const last = monthlySales.get("2026-06") ?? 0;
  const growth = ((last - first) / first * 100).toFixed(1);
  const format = (value: number) => value.toLocaleString("en-US");
  const insights = [
    `Synthetic sales total ${format(sales)} illustrative currency units across ${data.rows.length} records; profit is ${format(profit)} (${(profit / sales * 100).toFixed(1)}% margin).`,
    `${top?.[0]} has the highest synthetic category sales: ${format(top?.[1] ?? 0)}, or ${((top?.[1] ?? 0) / sales * 100).toFixed(1)}% of the total.`,
    `Monthly synthetic sales rise from ${format(first)} in January to ${format(last)} in June (${growth}%). This trend is deliberately built into the sample, not evidence of real-world growth.`,
  ];
  const problems = ["One synthetic record has a missing Region. Its sales remain in the overall total, but cannot be attributed to a named region.", "This small, formula-generated dataset cannot establish seasonality or support real business forecasts."];
  const recommendations = ["Resolve the missing Region before comparing regional performance.", "For a real retail review, compare category profit margins as well as sales before allocating stock.", "Validate a longer history and external business context before using a forecast for purchasing decisions."];
  return {
    title: "Synthetic Retail Analytics Demo",
    fileName: DEMO_FILE_NAME,
    data,
    charts: [],
    executiveSummary: `${DEMO_NOTICE}\n\nThis sample covers January–June 2026 with ${data.rows.length} generated records across four retail categories and three regions. ${insights[0]} ${insights[1]} ${insights[2]} One intentionally blank Region demonstrates the data health check. The recommendations below illustrate a retail review, not advice about a real business.`,
    insights,
    problems,
    recommendations,
    story: `${DEMO_NOTICE}\n\nThe sample retailer's sales rise because the generator increases units each month. Electronics leads sales in this constructed example, while category margins differ. A useful review would look beyond revenue to profitability and data completeness. Start by resolving the blank region, then compare the category and channel charts. These are illustrative observations calculated locally, not a live AI response or a verified forecast.`,
  };
}

export function retailDemoCSV() {
  const data = createRetailDemo();
  return [data.rawHeaders.join(","), ...data.rows.map(row => data.rawHeaders.map(header => row[header] ?? "").join(","))].join("\n");
}