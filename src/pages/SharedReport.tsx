import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Lock, Loader2, Moon, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import AutoDashboard from "@/components/dashboard/AutoDashboard";
import type { ParsedData } from "@/lib/data-processing";

interface Snapshot {
  fileName: string;
  columns: ParsedData["columns"];
  rows: ParsedData["rows"];
  rowCount: number;
  summaryText?: string;
}

interface Row {
  id: string;
  title: string;
  permission: string;
  snapshot: Snapshot;
}

export default function SharedReport() {
  const { id } = useParams<{ id: string }>();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("cognilytix_dark") === "true");
  const [row, setRow] = useState<Row | null>(null);
  const [lockedTitle, setLockedTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("cognilytix_dark", String(darkMode));
  }, [darkMode]);

  const themeToggle = (
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0"
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setDarkMode(mode => !mode)}
    >
      {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );

  const fetchReport = async (pwd?: string) => {
    const { data, error } = await supabase.functions.invoke("get-shared-report", {
      body: { id, password: pwd ?? "" },
    });
    if (error) {
      // Wrong password or unavailable report — keep messaging generic.
      return { ok: false as const };
    }
    return { ok: true as const, data: data as {
      requiresPassword?: boolean;
      title?: string;
      report?: Row;
    } };
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await fetchReport();
      if (!res.ok || (!res.data.report && !res.data.requiresPassword)) {
        setError("This report no longer exists or has expired.");
      } else if (res.data.requiresPassword) {
        setLockedTitle(res.data.title ?? "Shared report");
        setNeedsPassword(true);
      } else if (res.data.report) {
        setRow(res.data.report);
        setUnlocked(true);
      }
      setLoading(false);
    })();
  }, [id]);

  const tryUnlock = async () => {
    if (!password) return;
    const res = await fetchReport(password);
    if (res.ok && res.data.report) {
      setRow(res.data.report);
      setUnlocked(true);
      setNeedsPassword(false);
      setError(null);
    } else {
      setError("Incorrect password");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="fixed right-4 top-3">{themeToggle}</div>
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading report…
      </div>
    );
  }

  if (error && !row && !needsPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-6">
        <div className="fixed right-4 top-3">{themeToggle}</div>
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <img src="/logo.png" alt="Cognilytix AI logo" className="h-10 w-10 mx-auto" />
            <p className="text-lg font-semibold">Report unavailable</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (needsPassword && !unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-6">
        <div className="fixed right-4 top-3">{themeToggle}</div>
        <Card className="max-w-md w-full">
          <CardContent className="p-8 space-y-4">
            <div className="text-center">
              <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-lg font-semibold">Password required</p>
              <p className="text-sm text-muted-foreground">{lockedTitle}</p>
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="Enter password"
              onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button className="w-full" onClick={tryUnlock}>Unlock</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!row || !unlocked) return null;

  const parsed: ParsedData = {
    columns: row.snapshot.columns,
    rows: row.snapshot.rows,
    rawHeaders: row.snapshot.columns.map((c) => c.name),
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex min-h-14 items-center justify-between gap-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Link to="/" className="flex items-center gap-2" title="Home" aria-label="Cognilytix AI home">
              <img src="/logo.png" alt="Cognilytix AI logo" className="h-6 w-6" />
            </Link>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight break-words">{row.title}</p>
              <p className="text-[11px] text-muted-foreground break-words">Shared report · {row.snapshot.fileName}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground border rounded px-2 py-1">
              {row.permission}
            </span>
            {themeToggle}
          </div>
        </div>
      </header>
      <main className="container py-6">
        <AutoDashboard data={parsed} />
      </main>
    </div>
  );
}