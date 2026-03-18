import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Upload, Sparkles, BarChart3, Download, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-dashboard.png";

const features = [
  {
    icon: Upload,
    title: "Upload Any Dataset",
    description: "CSV, Excel, Google Sheets, or PDF tables — we handle them all with automatic column detection.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Insights",
    description: "Type natural language prompts like \"Show monthly revenue trend\" and get instant visualizations.",
  },
  {
    icon: BarChart3,
    title: "Rich Visualizations",
    description: "Bar charts, line graphs, pie charts, scatter plots, KPI cards — all in a responsive grid.",
  },
  {
    icon: Download,
    title: "Export Anywhere",
    description: "Download charts as PNG, export dashboards as PDF, or save summaries as Excel files.",
  },
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

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">InsightFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/projects")}>
              My Projects
            </Button>
            <Button variant="hero" size="lg" onClick={() => navigate("/dashboard")}>
              Start Analyzing
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-20 lg:py-32">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
        >
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Turn data into insights
            <br />
            <span className="text-primary">with a single prompt</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload your dataset, ask questions in plain English, and get beautiful
            visualizations instantly. No coding required.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Button variant="hero" size="lg" onClick={() => navigate("/dashboard")}>
              Start Analyzing — It's Free
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Browser mockup */}
        <motion.div
          className="mt-16 mx-auto max-w-5xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-lg">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-chart-3/60" />
                <div className="w-3 h-3 rounded-full bg-accent/60" />
              </div>
              <div className="flex-1 text-center text-xs text-muted-foreground">insightflow.app/dashboard</div>
            </div>
            <img src={heroImage} alt="InsightFlow dashboard showing AI-generated charts and data visualizations" className="w-full" />
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground">Everything you need to analyze data</h2>
            <p className="mt-4 text-muted-foreground">From upload to insight in under a minute.</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="rounded-lg border border-border bg-background p-6"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
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

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} InsightFlow. AI-powered data analytics.
        </div>
      </footer>
    </div>
  );
}
