import type { ParsedData } from "@/lib/data-processing";

export function calculateDatasetTotals(data: ParsedData) {
  const totals: Record<string, number> = {};
  const numericColumns = data.columns.filter((column) => column.type === "number");

  for (const column of numericColumns) {
    totals[column.name] = data.rows.reduce((sum, row) => {
      const value = Number(row[column.name]);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
  }

  return { rowCount: data.rows.length, numericTotals: totals };
}