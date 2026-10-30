import { describe, expect, it } from "vitest";
import { createRetailDemo, createRetailDemoReport, retailDemoCSV } from "./retail-demo";
import { calculateDatasetTotals } from "./report-data";

describe("isolated synthetic retail demo", () => {
  it("uses a fixed generated dataset rather than customer inputs", () => {
    const data = createRetailDemo();
    expect(data.rows).toHaveLength(72);
    expect(data.rows[0]).toEqual({ "Order Date": "2026-01-01", Region: null, Category: "Home", Channel: "Online", Sales: 480, Profit: 106, Units: 12 });
    expect(data.rows.filter(row => row.Region == null)).toHaveLength(1);
  });
  it("creates fresh data so demo changes cannot modify another instance", () => {
    const first = createRetailDemo();
    first.rows[0].Sales = 0;
    expect(createRetailDemo().rows[0].Sales).toBe(480);
  });
  it("calculates report figures from the complete synthetic dataset", () => {
    const report = createRetailDemoReport();
    expect(report.data).not.toBeNull();
    if (!report.data) throw new Error("Demo dataset missing");
    expect(calculateDatasetTotals(report.data).numericTotals.Sales).toBe(86940);
    expect(report.insights?.[0]).toContain("86,940");
    expect(retailDemoCSV().split("\n")).toHaveLength(73);
  });
});