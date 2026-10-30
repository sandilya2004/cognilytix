export type BillingCycle = "monthly" | "yearly";
export type PlanId = "free" | "starter_plan" | "professional_plan" | "business_plan" | "enterprise";

export interface Plan {
  id: PlanId;
  name: string;
  /** Prices in whole rupees; null = custom pricing. */
  monthlyInr: number | null;
  yearlyInr: number | null;
  priceIds?: Record<BillingCycle, string>;
  recommended?: boolean;
  features: string[];
  comingSoon?: string[];
}

export const PLANS: Plan[] = [
  {
    id: "free", name: "Free", monthlyInr: 0, yearlyInr: 0,
    features: ["3 analyses per month", "25 MB maximum upload size", "Excel and CSV uploads", "Basic data health checks", "Basic AI insights", "1 saved dashboard", "PDF export", "1 user"],
  },
  {
    id: "starter_plan", name: "Starter", monthlyInr: 799, yearlyInr: 7990,
    priceIds: { monthly: "starter_monthly", yearly: "starter_yearly" },
    features: ["20 analyses per month", "100 MB maximum upload size", "Advanced data health checks", "AI-generated insights", "5 saved dashboards", "PDF and PowerPoint exports", "Basic prediction insights", "1 user"],
  },
  {
    id: "professional_plan", name: "Professional", monthlyInr: 1999, yearlyInr: 19990, recommended: true,
    priceIds: { monthly: "professional_monthly", yearly: "professional_yearly" },
    features: ["100 analyses per month", "250 MB maximum upload size", "Advanced AI insights", "Interactive dashboards", "20 saved dashboards", "PDF and PowerPoint exports", "Advanced prediction insights", "Report sharing", "1 user"],
    comingSoon: ["Report history"],
  },
  {
    id: "business_plan", name: "Business", monthlyInr: 5999, yearlyInr: 59990,
    priceIds: { monthly: "business_monthly", yearly: "business_yearly" },
    features: ["250 analyses per month", "500 MB maximum upload size", "All Professional features", "Priority support"],
    comingSoon: ["5 team members", "Team dashboards", "Shared report access", "Centralized workspace", "Admin and user management", "Usage monitoring"],
  },
  {
    id: "enterprise", name: "Enterprise", monthlyInr: null, yearlyInr: null,
    features: ["Custom analysis and file-size limits", "Tailored onboarding and support arrangements"],
    comingSoon: ["Multiple teams and workspaces", "Advanced access controls", "Custom integrations and APIs", "Custom security and deployment"],
  },
];

/** Percentage saved by paying yearly instead of 12 monthly payments. */
export function annualSavingsPercent(monthly: number, yearly: number): number {
  if (monthly <= 0) return 0;
  return Math.round((1 - yearly / (monthly * 12)) * 1000) / 10;
}

export const CURRENCIES = ["INR", "USD", "EUR", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const formatInr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
