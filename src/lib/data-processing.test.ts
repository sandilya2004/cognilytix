import { expect, it } from "vitest";
import { parsedRows, parseExcelSheet } from "./data-processing";
import * as XLSX from "xlsx";

it("normalizes formatted numeric data for charts", () => {
  const result = parsedRows(["Amount"], [{ Amount: "$1,250.50" }, { Amount: "(100.25)" }]);
  expect(result.columns[0].type).toBe("number");
  expect(result.rows.map(row => row.Amount)).toEqual([1250.5, -100.25]);
});
it("preserves Excel dates and booleans", () => {
  const result = parsedRows(["Date", "Active"], [{ Date: new Date("2026-01-01"), Active: true }]);
  expect(result.columns.map(c => c.type)).toEqual(["date", "boolean"]);
  expect(result.rows[0].Date).toBe("2026-01-01T00:00:00.000Z");
});
it("handles empty Excel sheets without crashing", async () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), "Empty");
  const file = new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" })], "empty.xlsx");
  expect((await parseExcelSheet(file, "Empty")).rows).toEqual([]);
});
it("retains duplicate Excel headers as separate columns", async () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Sales", "Sales"], [10, 20]]), "Data");
  const file = new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" })], "duplicate.xlsx");
  const result = await parseExcelSheet(file, "Data");
  expect(result.rows[0]).toEqual({ Sales: 10, Sales_2: 20 });
});