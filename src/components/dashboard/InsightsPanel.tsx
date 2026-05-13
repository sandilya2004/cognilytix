import { useState, useEffect } from "react";
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, BarChart3, RefreshCw, Plus, Target, Scale, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ParsedData } from "@/lib/data-processing";

interface InsightsPanelProps {
  data: ParsedData;
}

interface Insight {
  icon: React.ElementType;
  text: string;
  type: "trend" | "highlight" | "anomaly" | "opportunity" | "risk" | "comparison" | "recommendation";
  category?: string;
}

function generateAllInsights(data: ParsedData): Insight[] {
  const insights: Insight[] = [];
  const numericCols = data.columns.filter(c => c.type === "number");
  const stringCols = data.columns.filter(c => c.type === "string");

  // Dataset overview
  insights.push({
    icon: BarChart3,
    text: `Your dataset has **${data.rows.length} records** across **${data.columns.length} columns** (${numericCols.length} numeric, ${stringCols.length} categorical).`,
    type: "highlight",
    category: "Overview",
  });

  // Per-numeric-column stats — variance, totals, ranges
  for (const col of numericCols) {
    const vals = data.rows.map(r => Number(r[col.name]) || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const range = max - min;

    if (range > avg * 2) {
      insights.push({
        icon: AlertTriangle,
        text: `**${col.name}** shows high variance — values range from ${min.toLocaleString()} to ${max.toLocaleString()} (${(range / avg).toFixed(1)}x the average). Consider segmenting your customers/products to manage risk.`,
        type: "risk",
        category: "Risks",
      });
    } else {
      insights.push({
        icon: TrendingUp,
        text: `**${col.name}** averages **${avg.toFixed(1)}** with a total of **${sum.toLocaleString()}** across all records.`,
        type: "highlight",
        category: "Trends",
      });
    }

    // Median vs average → skew detection (opportunity)
    const sorted = [...vals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median > 0 && Math.abs(avg - median) / median > 0.3) {
      insights.push({
        icon: Target,
        text: `**${col.name}** is skewed — median is **${median.toLocaleString()}** but average is **${avg.toFixed(1)}**. A few outliers are pulling results; focus on the typical case to find opportunities.`,
        type: "opportunity",
        category: "Opportunities",
      });
    }
  }

  // Cross-tab category × numeric: leaders, laggards, concentration, comparisons
  for (const sCol of stringCols) {
    for (const nCol of numericCols) {
      const groups = new Map<string, number>();
      for (const row of data.rows) {
        const key = String(row[sCol.name] ?? "Unknown");
        groups.set(key, (groups.get(key) || 0) + (Number(row[nCol.name]) || 0));
      }
      const sortedG = [...groups.entries()].sort((a, b) => b[1] - a[1]);
      if (sortedG.length < 2) continue;
      const total = sortedG.reduce((a, [, v]) => a + v, 0);
      if (total <= 0) continue;

      insights.push({
        icon: TrendingUp,
        text: `**${sortedG[0][0]}** leads in ${nCol.name} with **${sortedG[0][1].toLocaleString()}** (${((sortedG[0][1] / total) * 100).toFixed(1)}% of total).`,
        type: "trend",
        category: "Trends",
      });

      const last = sortedG[sortedG.length - 1];
      insights.push({
        icon: TrendingDown,
        text: `**${last[0]}** is the lowest in ${nCol.name} with only **${last[1].toLocaleString()}** — investigate why and consider corrective action.`,
        type: "risk",
        category: "Risks",
      });

      if (sortedG.length >= 2) {
        const ratio = sortedG[0][1] / Math.max(sortedG[1][1], 1);
        insights.push({
          icon: Scale,
          text: `Comparison: **${sortedG[0][0]}** is ${ratio.toFixed(1)}× the size of **${sortedG[1][0]}** in ${nCol.name}. ${ratio > 3 ? "Heavy concentration risk." : "Healthy spread."}`,
          type: "comparison",
          category: "Comparisons",
        });
      }

      // Top-3 concentration (Pareto-style)
      const top3 = sortedG.slice(0, 3).reduce((a, [, v]) => a + v, 0);
      const top3Pct = (top3 / total) * 100;
      if (sortedG.length > 4) {
        insights.push({
          icon: Target,
          text: `Top 3 ${sCol.name} values account for **${top3Pct.toFixed(0)}%** of ${nCol.name}. ${top3Pct > 70 ? "Diversify to reduce dependency." : "Spread looks balanced."}`,
          type: top3Pct > 70 ? "risk" : "opportunity",
          category: top3Pct > 70 ? "Risks" : "Opportunities",
        });
      }

      // Recommendation
      insights.push({
        icon: Sparkles,
        text: `Recommendation: focus growth efforts on **${sortedG[1][0]}** and **${sortedG[2]?.[0] ?? sortedG[0][0]}** — they have room to catch up to **${sortedG[0][0]}** in ${nCol.name}.`,
        type: "recommendation",
        category: "Recommendations",
      });
    }
  }

  // Shuffle within categories so each "load more" feels fresh
  return insights;
}

const typeColors: Record<string, string> = {
  trend: "border-l-primary bg-primary/5",
  highlight: "border-l-accent bg-accent/5",
  anomaly: "border-l-destructive bg-destructive/5",
  opportunity: "border-l-green-500 bg-green-500/5",
  risk: "border-l-amber-500 bg-amber-500/5",
  comparison: "border-l-blue-500 bg-blue-500/5",
  recommendation: "border-l-purple-500 bg-purple-500/5",
};

const typeIconColors: Record<string, string> = {
  trend: "text-primary",
  highlight: "text-accent",
  anomaly: "text-destructive",
  opportunity: "text-green-600",
  risk: "text-amber-600",
  comparison: "text-blue-600",
  recommendation: "text-purple-600",
};

const PAGE_SIZE = 5;

export default function InsightsPanel({ data }: InsightsPanelProps) {
  const [allInsights, setAllInsights] = useState<Insight[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const refresh = () => {
    setLoading(true);
    setVisibleCount(PAGE_SIZE);
    setTimeout(() => {
      const generated = generateAllInsights(data);
      // Mild shuffle to keep things interesting on refresh
      setAllInsights(generated);
      setLoading(false);
    }, 500);
  };

  const loadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((c) => c + PAGE_SIZE);
      setLoadingMore(false);
    }, 350);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const insights = allInsights.slice(0, visibleCount);
  const hasMore = visibleCount < allInsights.length;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">AI Insights</h3>
          {!loading && (
            <span className="text-[10px] text-muted-foreground">
              ({insights.length} of {allInsights.length})
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={refresh} title="Refresh insights">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="p-3 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 shimmer rounded-md" />
            ))}
            <p className="text-xs text-muted-foreground text-center pt-1">Analyzing your data...</p>
          </div>
        ) : (
          <>
          {insights.map((insight, i) => {
            const Icon = insight.icon;
            return (
              <div
                key={i}
                className={`rounded-md border-l-4 p-3 ${typeColors[insight.type]} transition-all hover:shadow-sm animate-fade-up`}
              >
                <div className="flex gap-2">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${typeIconColors[insight.type]}`} />
                  <div className="flex-1 min-w-0">
                    {insight.category && (
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                        {insight.category}
                      </p>
                    )}
                    <p
                      className="text-xs text-foreground leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: insight.text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {loadingMore && (
            <div className="space-y-2 pt-1">
              {[1, 2].map(i => <div key={i} className="h-14 shimmer rounded-md" />)}
            </div>
          )}
          {hasMore && !loadingMore && (
            <Button variant="outline" size="sm" className="w-full mt-2" onClick={loadMore}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              More Insights ({allInsights.length - visibleCount} remaining)
            </Button>
          )}
          {!hasMore && allInsights.length > PAGE_SIZE && (
            <p className="text-[11px] text-center text-muted-foreground pt-2">
              ✨ All insights loaded. Click refresh to regenerate.
            </p>
          )}
          </>
        )}
      </div>
    </div>
  );
}
