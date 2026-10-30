import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Clock, FileText, HelpCircle, Moon, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { getPaddleEnvironment } from "@/lib/paddle";
import { PLANS, annualSavingsPercent, formatInr, type BillingCycle, type Plan } from "@/lib/plans";

const faqs = [
  {
    question: "How do I upload a file?",
    answer: "Open the dashboard and choose a file or drag it into the upload area. For Excel workbooks, select the sheet you want to analyse. You can preview your data and review its data health before generating charts or insights.",
  },
  {
    question: "Which file formats are supported?",
    answer: "Cognilytix AI supports CSV (.csv) and Excel (.xlsx and .xls) files. PDF tables and Power BI datasets are not supported. Use a spreadsheet with column headings and rows of data.",
  },
  {
    question: "Where is my uploaded data stored?",
    answer: "Your uploaded file is read and processed in your browser. Saved projects stay in that browser on that device. Creating a shared report stores a report snapshot in your account. AI features send a limited excerpt for processing, as explained below.",
  },
  {
    question: "What data is used for AI analysis?",
    answer: "AI features send column names, summary figures, a small number of sample rows and your questions to server-side functions, which forward that information to a third-party AI provider. They do not send the whole uploaded file. You can use the data preview and chart tools without requesting AI analysis. Provider retention details still require owner confirmation; see the Privacy Policy.",
  },
  {
    question: "Can I rely on AI insights and predictions?",
    answer: "AI can explain patterns, suggest actions, generate stories and help explore future trends. Its output can be inaccurate or incomplete, and predictions are not guarantees. Results depend on the quality and structure of your data. Check important figures and recommendations before making business decisions.",
  },
  {
    question: "How do I generate and export reports?",
    answer: "After analysing your file, create charts and generate the insights, story or predictions you want to include. Export PDF and Export PPT are available next to Reports. Generate Executive Report is available in Auto Dashboard and Prediction Insights. Exports include available analysis results; sections you have not generated may not contain results. Share Report creates a link to a stored report snapshot.",
  },
  {
    question: "How can I remove my data?",
    answer: "Reset clears the current file from the dashboard. Delete saved projects on the Projects page and shared reports on the Reports page. Clearing your browser data also removes locally saved projects. Expired share links stop opening, but their stored snapshots are not automatically deleted. Account deletion procedures and provider retention terms require owner confirmation in the Privacy Policy.",
  },
  {
    question: "How do payments, taxes and refunds work?",
    answer: "Payments are processed by Paddle.com, our merchant of record, which adds GST or VAT where required and shows the final total before you pay. You can pay by card, Google Pay and other local methods where available. You can cancel any time from your Subscription page, and request a refund within 14 days of purchase.",
  },
];

export default function Pricing() {
  const { session, role } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("cognilytix_dark") === "true");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [selected, setSelected] = useState<Plan | null>(null);
  const [previewMode, setPreviewMode] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("cognilytix_dark", String(darkMode));
  }, [darkMode]);
  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    supabase.from("app_settings").select("preview_mode").eq("id", true).maybeSingle().then(({ data }) => setPreviewMode(data?.preview_mode ?? true));
  }, []);
  useEffect(() => {
    if (!session) { setCurrentPlan(null); return; }
    supabase.rpc("get_my_entitlements", { _env: getPaddleEnvironment() }).then(({ data }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCurrentPlan((data as any)?.plan_id ?? null);
    });
  }, [session]);
  const startHref = session ? (role === "admin" ? "/admin-dashboard" : "/dashboard") : "/auth?mode=signup";
  const choose = (plan: Plan) => {
    if (!session) { navigate(`/auth?mode=signup&next=${encodeURIComponent("/pricing")}`); return; }
    setSelected(plan);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-sm" aria-label="Main navigation">
        <div className="container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <img src="/logo.png" alt="Cognilytix AI logo" className="h-8 w-8 shrink-0" /> Cognilytix AI
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" asChild><Link to="/">Home</Link></Button>
            <Button variant="ghost" size="icon" aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} title={darkMode ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setDarkMode(mode => !mode)}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="hero" size="sm" asChild><Link to={startHref}>{session ? "Dashboard" : "Sign Up"}<ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </div>
        </div>
      </nav>

      <main>
        <section className="container max-w-7xl pb-12 pt-14 sm:pt-20">
          <header className="mx-auto mb-8 max-w-2xl space-y-4 text-center">
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-primary"><Sparkles className="h-4 w-4" /> Plans and pricing</p>
            <h1 className="text-3xl font-bold sm:text-4xl">Choose the plan that fits your analysis</h1>
            <p className="text-lg leading-relaxed text-muted-foreground">Prices in Indian rupees, excluding GST or VAT. Applicable tax is shown with the final total at checkout.</p>
            {previewMode && (
              <p className="rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm">Cognilytix is in preview: everyone currently keeps full access, and no automatic charges happen unless you choose to subscribe.</p>
            )}
          </header>

          <div className="mb-8 flex justify-center">
            <div className="inline-flex rounded-full border border-border bg-card p-1" role="group" aria-label="Billing frequency">
              {(["monthly", "yearly"] as BillingCycle[]).map(c => (
                <button key={c} onClick={() => setCycle(c)} aria-pressed={cycle === c}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${cycle === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  {c === "monthly" ? "Monthly" : "Annual"}{c === "yearly" && <span className="ml-1.5 text-xs opacity-80">save 16.7%</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {PLANS.map(plan => {
              const price = cycle === "monthly" ? plan.monthlyInr : plan.yearlyInr;
              const isCurrent = currentPlan === plan.id;
              return (
                <article key={plan.id} className={`relative flex flex-col rounded-lg border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${plan.recommended ? "border-primary shadow-md" : "border-border"}`}>
                  {plan.recommended && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">Most Popular</span>}
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                  <p className="mt-3 text-3xl font-bold">{price === null ? "Custom" : formatInr(price)}</p>
                  <p className="text-xs text-muted-foreground">{price === null ? "Tailored to your organisation" : price === 0 ? "Free forever" : cycle === "monthly" ? "per month + tax" : "per year + tax"}</p>
                  {cycle === "yearly" && plan.monthlyInr ? <p className="mt-1 text-xs text-accent">Save {annualSavingsPercent(plan.monthlyInr, plan.yearlyInr!)}% vs monthly</p> : null}
                  <ul className="my-5 space-y-2 text-sm">
                    {plan.features.map(f => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{f}</span></li>)}
                    {plan.comingSoon?.map(f => <li key={f} className="flex items-start gap-2 text-muted-foreground"><Clock className="mt-0.5 h-4 w-4 shrink-0" /><span>{f} <span className="text-xs">(coming soon)</span></span></li>)}
                  </ul>
                  <div className="mt-auto">
                    {plan.id === "enterprise" ? (
                      <Button variant="outline" className="w-full" asChild><a href="mailto:support@cognilytix.app?subject=Enterprise%20plan">Contact Sales</a></Button>
                    ) : plan.id === "free" ? (
                      <Button variant="outline" className="w-full" asChild><Link to={startHref}>{session ? "Open dashboard" : "Get Started"}</Link></Button>
                    ) : isCurrent ? (
                      <Button variant="outline" className="w-full" asChild><Link to="/account/subscription">Current plan</Link></Button>
                    ) : (
                      <Button variant={plan.recommended ? "hero" : "default"} className="w-full" onClick={() => choose(plan)}>{currentPlan && currentPlan !== "free" ? "Switch plan" : "Upgrade"}</Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">Cancel any time. 14-day refund window — see our <Link to="/refunds" className="underline">Refund Policy</Link>.</p>
        </section>
        <CheckoutDialog plan={selected} cycle={cycle} onClose={() => setSelected(null)} />

        <section id="faq" className="border-t border-border bg-card py-12 sm:py-16">
          <div className="container max-w-5xl">
            <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
              <header className="space-y-3">
                <HelpCircle className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Frequently asked questions</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">Files, privacy, AI analysis and reports.</p>
                <Link to="/privacy" className="inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4"><FileText className="h-4 w-4" /> Read our Privacy Policy</Link>
              </header>
              <Accordion type="single" collapsible className="min-w-0">
                {faqs.map((faq, index) => (
                  <AccordionItem key={faq.question} value={`faq-${index}`}>
                    <AccordionTrigger className="gap-4 text-left text-sm sm:text-base">{faq.question}</AccordionTrigger>
                    <AccordionContent className="leading-relaxed text-muted-foreground">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container flex flex-col justify-between gap-4 text-sm sm:flex-row">
          <p className="text-muted-foreground">© {new Date().getFullYear()} Cognilytix AI</p>
          <div className="flex flex-wrap gap-5">
            <Link to="/" className="text-muted-foreground hover:text-foreground">Home</Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link>
            <Link to="/refunds" className="text-muted-foreground hover:text-foreground">Refund Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}