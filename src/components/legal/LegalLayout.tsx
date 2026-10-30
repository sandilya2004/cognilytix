import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Brain, ArrowLeft, AlertTriangle } from "lucide-react";

export function OwnerConfirm({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-start gap-1 rounded border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
      <span>[Owner to confirm: {children}]</span>
    </span>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function LegalLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/80">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Cognilytix AI</span>
          </Link>
          <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </nav>
      <main className="container max-w-3xl py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground">Last updated: {updated}</p>
          <p className="rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            This page describes how the Cognilytix AI application currently works. It is a draft and is not legal
            advice. Items marked "Owner to confirm" must be completed or approved by the service owner before this
            page is relied on.
          </p>
        </header>
        {children}
        <footer className="border-t border-border pt-6 text-xs text-muted-foreground flex gap-4">
          <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
        </footer>
      </main>
    </div>
  );
}
