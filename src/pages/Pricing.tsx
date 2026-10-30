import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Brain, Check, FileText, HelpCircle, Moon, Sparkles, Sun, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";

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
    question: "What is available during preview, and what comes next?",
    answer: "Full access is available during preview. Paid plans for team collaboration are planned for the future, not available subscriptions today. Prices, billing cycles, subscription benefits and launch timing have not been announced.",
  },
];

export default function Pricing() {
  const { session, role } = useAuth();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("cognilytix_dark") === "true");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("cognilytix_dark", String(darkMode));
    window.scrollTo(0, 0);
  }, [darkMode]);
  const startHref = session ? (role === "admin" ? "/admin-dashboard" : "/dashboard") : "/auth?mode=signup";

  return (
    <div className="min-h-screen bg-background text-foreground">
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
        <section className="container max-w-5xl pb-12 pt-14 sm:pt-20">
          <header className="mb-10 max-w-2xl space-y-4">
            <p className="flex items-center gap-2 text-sm font-medium text-primary"><Sparkles className="h-4 w-4" /> Current product status</p>
            <h1 className="text-3xl font-bold sm:text-4xl">Pricing & FAQ</h1>
            <p className="text-lg leading-relaxed text-muted-foreground">Full access to Cognilytix AI during preview. Paid team collaboration plans are planned for the future.</p>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            <article className="flex flex-col rounded-lg border border-primary/40 bg-card p-6 sm:p-8">
              <div className="mb-5 flex items-center justify-between gap-3">
                <Sparkles className="h-6 w-6 text-primary" />
                <span className="text-xs font-semibold text-accent">AVAILABLE NOW</span>
              </div>
              <h2 className="text-2xl font-semibold">Preview access</h2>
              <p className="mt-2 text-lg font-medium text-primary">Full access during preview</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Explore the current product with your spreadsheets.</p>
              <ul className="my-6 space-y-3 text-sm">
                {["CSV and Excel uploads with data health checks", "Dashboards and chart-building tools", "AI insights, stories and predictions", "PDF and PowerPoint reports and report sharing"].map(item => (
                  <li key={item} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{item}</span></li>
                ))}
              </ul>
              <Button className="mt-auto w-full" variant="hero" asChild><Link to={startHref}>{session ? "Open dashboard" : "Get Started"}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </article>

            <article className="flex flex-col rounded-lg border border-border bg-card p-6 sm:p-8">
              <div className="mb-5 flex items-center justify-between gap-3">
                <Users className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">PLANNED</span>
              </div>
              <h2 className="text-2xl font-semibold">Team collaboration</h2>
              <p className="mt-2 text-lg font-medium">Paid plans coming in the future</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Team collaboration plans are planned, but are not available to purchase today.</p>
              <p className="mt-6 text-sm leading-relaxed text-muted-foreground">Prices, billing cycles, subscription benefits and launch timing have not been announced.</p>
              <div className="mt-auto border-t border-border pt-6 text-sm text-muted-foreground">No subscription checkout is available here.</div>
            </article>
          </div>
        </section>

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
          </div>
        </div>
      </footer>
    </div>
  );
}