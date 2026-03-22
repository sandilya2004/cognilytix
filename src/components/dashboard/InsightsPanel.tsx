import { useState, useEffect } from "react";
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ParsedData } from "@/lib/data-processing";

interface InsightsPanelProps {
  data: ParsedData;
}

interface Insight {
  icon: React.ElementType;
  text: string;
  type: "trend" | "highlight" | "anomaly";
}

function generateInsights(data: ParsedData): Insight[] {
  const insights: Insight[] = [];
  const numericCols = data.columns.filter(c => c.type === "number");
  const stringCols = data.columns.filter(c => c.type === "string");

  // Dataset overview
  insights.push({
    icon: BarChart3,
    text: `Your dataset has **${data.rows.length} records** across **${data.columns.length} columns** (${numericCols.length} numeric, ${stringCols.length} categorical).`,
    type: "highlight",
  });

  // Top numeric column stats
  for (const col of numericCols.slice(0, 3)) {
    const vals = data.rows.map(r => Number(r[col.name]) || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    const range = max - min;

    if (range > avg * 2) {
      insights.push({
        icon: AlertTriangle,
        text: `**${col.name}** has high variance — values range from ${min.toLocaleString()} to ${max.toLocaleString()}, which is ${(range / avg).toFixed(1)}x the average.`,
        type: "anomaly",
      });
    } else {
      insights.push({
        icon: TrendingUp,
        text: `**${col.name}** averages **${avg.toFixed(1)}** with a total of **${sum.toLocaleString()}** across all records.`,
        type: "highlight",
      });
    }
  }

  // Top category by first string col
  if (stringCols.length > 0 && numericCols.length > 0) {
    const catCol = stringCols[0].name;
    const valCol = numericCols[0].name;
    const groups = new Map<string, number>();
    for (const row of data.rows) {
      const key = String(row[catCol] ?? "Unknown");
      groups.set(key, (groups.get(key) || 0) + (Number(row[valCol]) || 0));
    }
    const sorted = [...groups.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length >= 2) {
      insights.push({
        icon: TrendingUp,
        text: `**${sorted[0][0]}** leads in ${valCol} with **${sorted[0][1].toLocaleString()}**, followed by **${sorted[1][0]}** at ${sorted[1][1].toLocaleString()}.`,
        type: "trend",
      });
      const last = sorted[sorted.length - 1];
      insights.push({
        icon: TrendingDown,
        text: `**${last[0]}** is the lowest in ${valCol} with only **${last[1].toLocaleString()}** — potential area for improvement.`,
        type: "anomaly",
      });
    }
  }

  return insights.slice(0, 5);
}

const typeColors: Record<string, string> = {
  trend: "border-l-primary bg-primary/5",
  highlight: "border-l-accent bg-accent/5",
  anomaly: "border-l-destructive bg-destructive/5",
};

const typeIconColors: Record<string, string> = {
  trend: "text-primary",
  highlight: "text-accent",
  anomaly: "text-destructive",
};

export default function InsightsPanel({ data }: InsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    setTimeout(() => {
      setInsights(generateInsights(data));
      setLoading(false);
    }, 600);
  };

  useEffect(() => {
    refresh();
  }, [data]);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">AI Insights</h3>
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
          insights.map((insight, i) => {
            const Icon = insight.icon;
            return (
              <div
                key={i}
                className={`rounded-md border-l-4 p-3 ${typeColors[insight.type]} transition-all hover:shadow-sm`}
              >
                <div className="flex gap-2">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${typeIconColors[insight.type]}`} />
                  <p
                    className="text-xs text-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: insight.text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
