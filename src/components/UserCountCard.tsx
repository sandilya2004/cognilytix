import { useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";
import { animate } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const POLL_MS = 15000;

export default function UserCountCard() {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [display, setDisplay] = useState(0);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error } = await supabase.rpc("get_registered_user_count");
      if (!active) return;
      if (error || typeof data !== "number") setError(true);
      else { setError(false); setCount(data); }
    };
    load();
    const id = setInterval(load, POLL_MS);
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => { active = false; clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  useEffect(() => {
    if (count === null || count === prev.current) return;
    const from = prev.current ?? 0;
    prev.current = count;
    const ctl = animate(from, count, { duration: 0.8, ease: "easeOut", onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => ctl.stop();
  }, [count]);

  return (
    <div className="mx-auto max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
      <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Users className="h-6 w-6 text-primary" />
      </div>
      {count === null && !error ? (
        <>
          <div className="mx-auto h-9 w-28 animate-pulse rounded bg-muted" />
          <p className="mt-2 text-sm text-muted-foreground">Loading users...</p>
        </>
      ) : count === null ? (
        <p className="text-sm text-muted-foreground">User count temporarily unavailable</p>
      ) : (
        <>
          <p className="text-4xl font-bold text-foreground tabular-nums">{display.toLocaleString()}+</p>
          <p className="mt-1 text-sm font-medium text-foreground">Registered Users</p>
          <p className="text-xs text-muted-foreground">Growing every day</p>
        </>
      )}
      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={`h-2 w-2 rounded-full ${error ? "bg-destructive" : "bg-accent animate-pulse"}`} />
        {error ? "Reconnecting..." : "Updating live"}
      </p>
    </div>
  );
}
