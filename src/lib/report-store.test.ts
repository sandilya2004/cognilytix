import { afterEach, describe, expect, it } from "vitest";
import { clearReportStore, reportStore, setReportStore } from "@/lib/report-store";

describe("reportStore", () => {
  afterEach(() => clearReportStore());

  it("keeps story and prediction results when different tabs update their content", () => {
    setReportStore({ story: "Quarterly sales grew across three regions." });
    setReportStore({ predictions: ["Revenue is forecast to rise by 8%."], predictionAI: "Prioritize repeat customers." });
    setReportStore({ predictionInsights: { growth: ["Expand the strongest region."], risks: [], actions: [], trends: [] } });

    expect(reportStore.story).toBe("Quarterly sales grew across three regions.");
    expect(reportStore.predictions).toEqual(["Revenue is forecast to rise by 8%."]);
    expect(reportStore.predictionAI).toBe("Prioritize repeat customers.");
    expect(reportStore.predictionInsights?.growth).toEqual(["Expand the strongest region."]);
  });

  it("clears saved report content when the dashboard dataset resets", () => {
    setReportStore({ story: "Dataset story", predictions: ["Dataset forecast"] });

    clearReportStore();

    expect(reportStore.story).toBeUndefined();
    expect(reportStore.predictions).toBeUndefined();
  });
});