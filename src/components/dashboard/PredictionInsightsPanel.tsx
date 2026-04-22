import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Lightbulb, Sparkles, RefreshCw, Brain, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ParsedData } from "@/lib/data-processing";

interface PredictionInsightsPanelProps {
  data: ParsedData;
}

interface InsightItem {
  title: string;
  detail: string;
}

interface Insights {
  growth: InsightItem[];
  risks: InsightItem[];
  actions: InsightItem[];
  trends: InsightItem[];
}

const sections: {
  key: keyof Insights;
  label: string;
  emoji: string;
  icon: React.ElementType;
  accent: string;
  bg: string;
}[] = [
  { key: "growth", label: "Growth Opportunities", emoji: "📈", icon: TrendingUp, accent: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  { key: "risks", label: "Risk / Loss Areas", emoji: "📉", icon: TrendingDown, accent: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
  { key: "actions", label: "Recommended Actions", emoji: "💡", icon: Lightbulb, accent: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  { key: "trends", label: "Future Trends", emoji: "🔮", icon: Sparkles, accent: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10" },
];

export default function PredictionInsightsPanel({ data }: PredictionInsightsPanelProps) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<{ key: string; text: string } | null>(null);
  const [explainLoading, setExplainLoading] = useState<string | null>(null);

  // Pre-compute aggregations from the dataset (locally, before sending to AI)
  const aggregations = useMemo(() => {
    if (!data) return null;
    const numCols = data.columns.filter(c => c.type === "number").map(c => c.name);
    const catCols = data.columns.filter(c => c.type === "string").map(c => c.name);
    const dateCols = data.columns.filter(c => c.type === "date").map(c => c.name);

    if (numCols.length === 0 || catCols.length === 0) return null;

    const result: Record<string, unknown> = {};

    // Group by each categorical column, sum/avg numeric columns
    for (const cat of catCols.slice(0, 3)) {
      const grouped = new Map<string, { count: number; sums: Record<string, number> }>();
      for (const row of data.rows) {
        const key = String(row[cat] ?? "Unknown");
        if (!grouped.has(key)) grouped.set(key, { count: 0, sums: {} });
        const entry = grouped.get(key)!;
        entry.count++;
        for (const num of numCols.slice(0, 4)) {
          entry.sums[num] = (entry.sums[num] || 0) + (Number(row[num]) || 0);
        }
      }
      const summary = Array.from(grouped.entries())
        .map(([k, v]) => {
          const out: Record<string, number | string> = { [cat]: k, count: v.count };
          for (const num of numCols.slice(0, 4)) {
            out[`total_${num}`] = Math.round((v.sums[num] || 0) * 100) / 100;
            out[`avg_${num}`] = Math.round(((v.sums[num] || 0) / v.count) * 100) / 100;
          }
          return out;
        })
        .sort((a, b) => Number(b[`total_${numCols[0]}`] || 0) - Number(a[`total_${numCols[0]}`] || 0))
        .slice(0, 15);
      result[`by_${cat}`] = summary;
    }

    // Time-based trend if date column exists
    if (dateCols.length > 0 && numCols.length > 0) {
      const dateCol = dateCols[0];
      const trendMap = new Map<string, Record<string, number>>();
      for (const row of data.rows) {
        const raw = row[dateCol];
        if (!raw) continue;
        const d = new Date(String(raw));
        if (isNaN(d.getTime())) continue;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!trendMap.has(key)) trendMap.set(key, {});
        const entry = trendMap.get(key)!;
        for (const num of numCols.slice(0, 3)) {
          entry[num] = (entry[num] || 0) + (Number(row[num]) || 0);
        }
      }
      const trend = Array.from(trendMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([period, vals]) => ({
          period,
          ...Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, Math.round(v * 100) / 100])),
        }));
      result.time_trend = trend;
    }

    return result;
  }, [data]);

  const canPredict = aggregations !== null && data.rows.length >= 5;

  const generate = async () => {
    if (!aggregations) return;
    setLoading(true);
    setExplanation(null);
    try {
      const columnInfo = data.columns.map(c => `${c.name} (${c.type})`).join(", ");
      const { data: resp, error } = await supabase.functions.invoke("prediction-insights", {
        body: { aggregations, columnInfo, totalRows: data.rows.length },
      });
      if (error) throw error;
      if (resp?.insights) {
        setInsights({
          growth: resp.insights.growth || [],
          risks: resp.insights.risks || [],
          actions: resp.insights.actions || [],
          trends: resp.insights.trends || [],
        });
        toast.success("Prediction insights ready!");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate insights";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const explainItem = async (sectionLabel: string, item: InsightItem, key: string) => {
    setExplainLoading(key);
    try {
      const columnInfo = data.columns.map(c => `${c.name} (${c.type})`).join(", ");
      const prompt = `In the context of this dataset (columns: ${columnInfo}, ${data.rows.length} rows), explain in 2-3 simple sentences WHY this insight is happening: "${item.title} — ${item.detail}". Focus on the likely business reason. Use plain language.`;
      const { data: resp, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [{ role: "user", content: prompt }],
          context: `Aggregated summary: ${JSON.stringify(aggregations).slice(0, 1500)}`,
        },
      });
      if (error) throw error;
      const text = (resp?.response || "No explanation available.").replace(/\[CREATE_VISUAL\].*$/s, "").trim();
      setExplanation({ key, text });
    } catch {
      toast.error("Could not generate explanation.");
    } finally {
      setExplainLoading(null);
    }
  };

  // Empty / not-enough-data state
  if (!canPredict) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center space-y-3">
          <Brain className="h-10 w-10 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">Prediction Insights</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Not enough data to generate prediction insights. You need at least one categorical column (like Region) and one numeric column (like Sales).
          </p>
        </div>
      </div>
    );
  }

  // Initial state — show the trigger
  if (!insights && !loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Prediction Insights</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Get clear, actionable business recommendations based on your data — where to grow, what to fix, and what to expect next.
          </p>
          <Button onClick={generate} size="lg">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Prediction Insights
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-lg border border-border bg-card p-12 text-center space-y-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Analyzing patterns and generating insights…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Prediction Insights
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Actionable recommendations in plain language.</p>
        </div>
        <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(section => {
          const items = insights?.[section.key] || [];
          const Icon = section.icon;
          return (
            <div key={section.key} className="rounded-lg border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${section.bg}`}>
                  <Icon className={`h-4 w-4 ${section.accent}`} />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  <span className="mr-1">{section.emoji}</span> {section.label}
                </h3>
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No insights detected for this section.</p>
              ) : (
                <ul className="space-y-3">
                  {items.map((item, idx) => {
                    const itemKey = `${section.key}-${idx}`;
                    const isExplaining = explainLoading === itemKey;
                    const showExplanation = explanation?.key === itemKey;
                    return (
                      <li key={itemKey} className="rounded-md border border-border/60 bg-background/40 p-3 space-y-2">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                        <div className="flex items-center justify-between pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => explainItem(section.label, item, itemKey)}
                            disabled={isExplaining}
                          >
                            <HelpCircle className="h-3 w-3" />
                            {isExplaining ? "Thinking…" : "Why is this happening?"}
                          </Button>
                        </div>
                        {showExplanation && (
                          <div className="rounded-md bg-primary/5 border border-primary/20 p-2.5 text-xs text-foreground leading-relaxed">
                            {explanation.text}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center pt-2">
        Insights are AI-generated from aggregated patterns in your data. Use them as a starting point for decisions.
      </p>
    </div>
  );
}