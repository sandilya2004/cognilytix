import { useNavigate } from "react-router-dom";
import { Brain, ArrowLeft, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Free Trial",
    price: "₹0",
    period: "for 1 month",
    description: "Try all features free for 30 days. Subscribe in the last 7 days to continue.",
    features: [
      "Upload CSV, Excel & PDF data",
      "AI-powered visualizations",
      "Up to 10 charts per project",
      "Export PDF",
      "5 folders & 10 projects",
    ],
    cta: "Start Free Trial",
    variant: "outline" as const,
    highlighted: false,
  },
  {
    name: "Pro",
    price: "₹999",
    period: "/month",
    description: "For professionals who need unlimited analytics and advanced AI insights.",
    features: [
      "Everything in Free Trial",
      "Unlimited charts & projects",
      "Advanced AI summaries",
      "Priority support",
      "Custom branding on exports",
      "Collaboration (coming soon)",
    ],
    cta: "Subscribe to Pro",
    variant: "hero" as const,
    highlighted: true,
  },
  {
    name: "Business",
    price: "₹2,999",
    period: "/month",
    description: "For teams that need advanced analytics, collaboration, and dedicated support.",
    features: [
      "Everything in Pro",
      "Team workspaces",
      "Role-based access control",
      "API access",
      "Dedicated account manager",
      "SSO & audit logs",
    ],
    cta: "Contact Sales",
    variant: "outline" as const,
    highlighted: false,
  },
];

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Cognilytix AI</span>
          </div>
        </div>
      </header>

      <main className="container py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Choose Your Plan</h1>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Start with a 1-month free trial. Upgrade anytime to unlock unlimited analytics.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-xl border p-6 flex flex-col ${
                plan.highlighted
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 relative"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                  <Star className="h-3 w-3" /> Most Popular
                </div>
              )}
              <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
              <div className="mt-3">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground text-sm ml-1">{plan.period}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground flex-grow">{plan.description}</p>
              <ul className="mt-6 space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.variant as any}
                className="mt-8 w-full"
                onClick={() => {
                  if (plan.name === "Free Trial") navigate("/dashboard");
                  else navigate("/pricing");
                }}
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
