import { describe, expect, it } from "vitest";
import { calculateDatasetTotals } from "@/lib/report-data";

describe("calculateDatasetTotals", () => {
  it("computes numeric totals across every row, not just the sample rows", () => {
    const data = {
      columns: [
        { name: "Revenue", type: "number" as const },
        { name: "Profit", type: "number" as const },
        { name: "Region", type: "string" as const },
      ],
      rows: [
        { Revenue: 1200, Profit: 240, Region: "North" },
        { Revenue: 1500, Profit: 310, Region: "South" },
        { Revenue: 1800, Profit: 400, Region: "North" },
        { Revenue: 2200, Profit: 510, Region: "West" },
        { Revenue: 2500, Profit: 600, Region: "South" },
        { Revenue: 2900, Profit: 700, Region: "East" },
      ],
      rawHeaders: ["Revenue", "Profit", "Region"],
    };

    expect(calculateDatasetTotals(data)).toEqual({
      rowCount: 6,
      numericTotals: { Revenue: 12100, Profit: 2760 },
    });
  });
});