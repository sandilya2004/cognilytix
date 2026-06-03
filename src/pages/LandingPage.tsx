import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Brain, Upload, Sparkles, BarChart3, Download, ArrowRight, Moon, Sun, LogOut,
  LineChart, ShieldCheck, FileText, Share2, ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import heroImage from "@/assets/hero-dashboard.png";
import { useAuth } from "@/hooks/useAuth";

const features = [
  { icon: BarChart3, title: "Dashboard Generation", description: "Auto-build executive dashboards from any CSV or Excel — KPIs, trends, comparisons in one click." },
  { icon: Sparkles, title: "AI Insights", description: "Plain-English explanations of what's happening in your data, written for executives." },
  { icon: LineChart, title: "Prediction Insights", description: "Forward-looking forecasts, growth opportunities, and risk areas surfaced automatically." },
  { icon: ShieldCheck, title: "Data Health Check", description: "Spot missing values, duplicates, outliers, and wrong types — with Excel fix instructions." },
  { icon: FileText, title: "Executive Reports", description: "Generate board-ready PDF + PowerPoint decks in one click." },
  { icon: Share2, title: "Interactive Sharing", description: "Send secure share links — recipients can still filter, slice, and explore live." },
];

const useCases = [
  { title: "Retail Analytics", desc: "Track store-level sales, identify top SKUs, and forecast inventory needs." },
  { title: "Sales Analysis", desc: "Pipeline trends, win rates by region, and revenue forecasts in seconds." },
  { title: "Business Performance", desc: "Monitor KPIs, profit margins, and growth across business units." },
  { title: "Growth Opportunities", desc: "AI-surfaced areas of upside hidden in your operational data." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { session, role, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("cognilytix_dark") === "true");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("cognilytix_dark", String(darkMode));
  }, [darkMode]);

  const dashHref = role === "admin" ? "/admin-dashboard" : "/dashboard";
  const goStart = () => navigate(session ? dashHref : "/auth");
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">Cognilytix AI</span>
          </button>
          <div className="hidden md:flex items-center gap-1 text-sm">
            <button onClick={() => scrollTo("features")} className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">Features</button>
            <button onClick={() => scrollTo("why")} className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">Why Cognilytix</button>
            <button onClick={() => scrollTo("use-cases")} className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">Use Cases</button>
            <button onClick={() => scrollTo("pricing")} className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">Pricing</button>
            <button onClick={() => scrollTo("contact")} className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">Contact</button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDarkMode(!darkMode)} title="Toggle dark mode">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {session ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate(dashHref)}>Dashboard</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/reports")}>Reports</Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => { await signOut(); }} title="Sign out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Login</Button>
                <Button variant="hero" size="sm" onClick={() => navigate("/auth?mode=signup")}>
                  Sign Up <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-20 lg:py-32">
        <motion.div className="mx-auto max-w-3xl text-center" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-6">
            <Sparkles className="h-3 w-3" /> AI-powered analytics for every team
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            AI-Powered Business
            <br />
            <span className="text-primary">Analytics Platform</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Turn raw data into insights, predictions, and decisions using AI.
            Upload a spreadsheet, ask in plain English, and ship board-ready reports in minutes.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button variant="hero" size="lg" onClick={goStart}>
              Get Started
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/auth")}>
              Login
            </Button>
          </div>
        </motion.div>

        <motion.div className="mt-16 mx-auto max-w-5xl" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}>
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-chart-3/60" />
                <div className="w-3 h-3 rounded-full bg-accent/60" />
              </div>
              <div className="flex-1 text-center text-xs text-muted-foreground">cognilytix.ai/dashboard</div>
            </div>
            <img src={heroImage} alt="Cognilytix AI dashboard showing AI-generated charts and data visualizations" className="w-full" />
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-card py-20 scroll-mt-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">Everything you need to analyze data</h2>
            <p className="mt-4 text-muted-foreground">From upload to insight in under a minute.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div key={feature.title} className="rounded-lg border border-border bg-background p-6" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Cognilytix */}
      <section id="why" className="border-t border-border py-20 scroll-mt-20">
        <div className="container max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Why Cognilytix</h2>
            <p className="mt-3 text-muted-foreground">Built so anyone on your team can act on data — not just analysts.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { t: "Simple prompt-based analytics", d: "Type a question in plain English. Get a chart. No SQL, no formulas." },
              { t: "AI explanations", d: "Every chart and metric comes with a written summary of what it means." },
              { t: "Decision intelligence", d: "Move from numbers to recommendations: what's working, what's not, what to do next." },
              { t: "Professional dashboards", d: "Executive-grade visuals you can put in front of customers, investors, or your board." },
            ].map((x) => (
              <div key={x.t} className="rounded-lg border border-border bg-card p-6">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-primary" /> {x.t}
                </p>
                <p className="mt-2 text-sm text-muted-foreground pl-6">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="border-t border-border bg-card py-20 scroll-mt-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Built for real business questions</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {useCases.map((u) => (
              <div key={u.title} className="rounded-lg border border-border bg-background p-6">
                <h3 className="font-semibold text-foreground">{u.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials placeholder */}
      <section className="border-t border-border py-20">
        <div className="container max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-foreground">Trusted by teams that move fast</h2>
          <p className="mt-4 text-muted-foreground">Customer stories coming soon. Want to be featured? Get in touch.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-left">
                <div className="h-2 w-16 bg-muted rounded mb-3" />
                <div className="h-2 w-full bg-muted/60 rounded mb-1.5" />
                <div className="h-2 w-4/5 bg-muted/60 rounded mb-1.5" />
                <div className="h-2 w-2/3 bg-muted/60 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + Pricing placeholder */}
      <section id="pricing" className="border-t border-border bg-card py-20 scroll-mt-20">
        <div className="container max-w-3xl text-center space-y-6">
          <h2 className="text-3xl font-bold text-foreground">Start free. Upgrade when you're ready.</h2>
          <p className="text-muted-foreground">Full access during preview. Paid plans for team collaboration coming soon.</p>
          <Button variant="hero" size="lg" onClick={goStart}>
            Get Started <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="border-t border-border py-12 scroll-mt-20">
        <div className="container grid gap-8 sm:grid-cols-4 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-semibold">Cognilytix AI</span>
            </div>
            <p className="text-muted-foreground text-xs">AI-powered business analytics platform.</p>
          </div>
          <div>
            <p className="font-semibold mb-2">Product</p>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li><button onClick={() => scrollTo("features")} className="hover:text-foreground">Features</button></li>
              <li><button onClick={() => scrollTo("use-cases")} className="hover:text-foreground">Use Cases</button></li>
              <li><button onClick={() => scrollTo("pricing")} className="hover:text-foreground">Pricing</button></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Company</p>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li><button onClick={() => scrollTo("why")} className="hover:text-foreground">About</button></li>
              <li><a href="mailto:hello@cognilytix.app" className="hover:text-foreground">Contact</a></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Legal</p>
            <ul className="space-y-1 text-muted-foreground text-xs">
              <li>Privacy Policy</li>
              <li>Terms &amp; Conditions</li>
            </ul>
          </div>
        </div>
        <div className="container mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Cognilytix AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
