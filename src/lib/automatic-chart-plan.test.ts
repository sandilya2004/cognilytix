import { describe, expect, it } from "vitest";
import { buildAutomaticPlan, nextAutomaticCount, RECORD_COUNT, ROW_CATEGORY } from "./automatic-chart-plan";
import type { ParsedData } from "./data-processing";

const data: ParsedData = {
  columns: [{ name: "Region", type: "string" }, { name: "Sales", type: "number" }],
  rows: [{ Region: "North", Sales: 20 }, { Region: "South", Sales: 30 }], rawHeaders: ["Region", "Sales"],
};
describe("automatic chart generation", () => {
  it("provides five automatic views for a category and a measure", () => {
    expect(buildAutomaticPlan(data).length).toBeGreaterThanOrEqual(5);
  });
  it("automatically adds charts rather than opening the manual builder", () => {
    expect(nextAutomaticCount(5, 20)).toBe(8);
    expect(nextAutomaticCount(8, 9)).toBe(9);
  });
  it("uses record counts for categorical-only datasets", () => {
    const plan = buildAutomaticPlan({ ...data, columns: [data.columns[0]] });
    expect(plan[0]).toEqual({ kind: "hbar", cat: "Region", val: RECORD_COUNT });
  });
  it("uses record numbers for numeric-only datasets", () => {
    expect(buildAutomaticPlan({ ...data, columns: [data.columns[1]] })[0]).toEqual({ kind: "hbar", cat: ROW_CATEGORY, val: "Sales" });
  });
  it("does not treat identifier columns as measures", () => {
    const plan = buildAutomaticPlan({ ...data, columns: [...data.columns, { name: "Order ID", type: "number" }] });
    expect(JSON.stringify(plan)).not.toContain("Order ID");
  });
});