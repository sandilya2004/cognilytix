import { describe, expect, it } from "vitest";
import { PLANS, annualSavingsPercent } from "./plans";

const byId = (id: string) => PLANS.find(p => p.id === id)!;

describe("subscription plans", () => {
  it("uses the agreed monthly and annual rupee prices", () => {
    expect([byId("starter_plan").monthlyInr, byId("starter_plan").yearlyInr]).toEqual([799, 7990]);
    expect([byId("professional_plan").monthlyInr, byId("professional_plan").yearlyInr]).toEqual([1999, 19990]);
    expect([byId("business_plan").monthlyInr, byId("business_plan").yearlyInr]).toEqual([5999, 59990]);
    expect(byId("enterprise").monthlyInr).toBeNull();
  });

  it("includes 3/20/100/250 analyses per month", () => {
    expect(byId("free").features).toContain("3 analyses per month");
    expect(byId("starter_plan").features).toContain("20 analyses per month");
    expect(byId("professional_plan").features).toContain("100 analyses per month");
    expect(byId("business_plan").features).toContain("250 analyses per month");
  });

  it("recommends Professional only", () => {
    expect(PLANS.filter(p => p.recommended).map(p => p.id)).toEqual(["professional_plan"]);
  });

  it("annual billing saves about 16.7%", () => {
    expect(annualSavingsPercent(799, 7990)).toBeCloseTo(16.7, 1);
    expect(annualSavingsPercent(1999, 19990)).toBeCloseTo(16.7, 1);
  });
});
