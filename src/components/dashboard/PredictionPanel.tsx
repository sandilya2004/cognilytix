import { useState } from "react";
import { TrendingUp, RefreshCw, Brain, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ParsedData } from "@/lib/data-processing";
import { supabase } from "@/integrations/supabase/client";
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell, ComposedChart,
} from "recharts";

const FORECAST_COLOR = "hsl(160, 84%, 39%)";
const ACTUAL_COLOR = "hsl(239, 84%, 67%)";

// Pick a chart style per prediction index so visuals vary (bar / column / combo)
const chartStyles = ["column", "bar", "combo", "column"] as const;
type ChartStyle = typeof chartStyles[number];

interface PredictionPanelProps {
  data: ParsedData;
}

interface Prediction {
  column: string;
  currentAvg: number;
  predictedAvg: number;
  changePercent: number;
  trend: "up" | "down";
  recommendation: string;
  forecastData: { period: string; actual?: number; predicted?: number }[];
}

export default function PredictionPanel({ data }: PredictionPanelProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [aiInsight, setAiInsight] = useState("");
  const [loading, setLoading] = useState(false);

  const generatePredictions = async () => {
    setLoading(true);
    try {
      const numCols = data.columns.filter(c => c.type === "number");
      const localPredictions: Prediction[] = [];

      for (const col of numCols.slice(0, 4)) {
        const vals = data.rows.map(r => Number(r[col.name]) || 0);
        const n = vals.length;
        if (n < 2) continue;

        // Simple linear regression for trend
        const xMean = (n - 1) / 2;
        const yMean = vals.reduce((a, b) => a + b, 0) / n;
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) {
          num += (i - xMean) * (vals[i] - yMean);
          den += (i - xMean) ** 2;
        }
        const slope = den !== 0 ? num / den : 0;
        const intercept = yMean - slope * xMean;

        // Forecast next 3 periods
        const forecastData: { period: string; actual?: number; predicted?: number }[] = [];
        const step = Math.max(1, Math.floor(n / 5));
        for (let i = 0; i < n; i += step) {
          forecastData.push({ period: `P${Math.floor(i / step) + 1}`, actual: Math.round(vals[i] * 100) / 100 });
        }
        for (let i = 0; i < 3; i++) {
          const pred = intercept + slope * (n + i * step);
          forecastData.push({ period: `F${i + 1}`, predicted: Math.round(Math.max(0, pred) * 100) / 100 });
        }

        const predictedAvg = intercept + slope * (n + step);
        const changePercent = yMean !== 0 ? ((predictedAvg - yMean) / yMean) * 100 : 0;

        localPredictions.push({
          column: col.name,
          currentAvg: Math.round(yMean * 100) / 100,
          predictedAvg: Math.round(Math.max(0, predictedAvg) * 100) / 100,
          changePercent: Math.round(changePercent * 10) / 10,
          trend: changePercent >= 0 ? "up" : "down",
          recommendation: changePercent >= 0
            ? `${col.name} shows a positive trend. Continue current strategies to maintain growth.`
            : `${col.name} is declining. Investigate causes and consider corrective actions.`,
          forecastData,
        });
      }

      setPredictions(localPredictions);

      // Get AI-powered insights
      try {
        const predSummary = localPredictions.map(p =>
          `${p.column}: current avg ${p.currentAvg}, predicted ${p.predictedAvg} (${p.changePercent > 0 ? "+" : ""}${p.changePercent}%)`
        ).join("; ");
        const colInfo = data.columns.map(c => `${c.name} (${c.type})`).join(", ");

        const { data: aiData, error } = await supabase.functions.invoke("ai-chat", {
          body: {
            prompt: `Based on this data with columns: ${colInfo} and ${data.rows.length} rows, and these trend predictions: ${predSummary}, provide:
1. Top 3 strategic recommendations for business improvement
2. What areas should be focused on to increase performance
3. Risk areas to watch out for
Be concise and actionable.`,
            context: "",
          },
        });
        if (!error && aiData?.response) setAiInsight(aiData.response);
      } catch { /* optional */ }
    } finally {
      setLoading(false);
    }
  };

  if (predictions.length === 0 && !loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto">
            <Brain className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Predictive Analysis</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Use AI to forecast trends and get actionable recommendations based on your data patterns.
          </p>
          <Button onClick={generatePredictions} size="lg">
            <TrendingUp className="h-4 w-4 mr-2" />
            Generate Predictions
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
          <p className="text-sm text-muted-foreground">Running predictive analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Predictive Analysis
        </h2>
        <Button variant="outline" size="sm" onClick={generatePredictions}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {predictions.map(p => (
          <div key={p.column} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground truncate">{p.column}</p>
            <p className="text-xl font-bold text-foreground mt-1">{p.predictedAvg.toLocaleString()}</p>
            <div className={`flex items-center gap-1 text-xs mt-1 ${p.trend === "up" ? "text-accent" : "text-destructive"}`}>
              {p.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {p.changePercent > 0 ? "+" : ""}{p.changePercent}% predicted
            </div>
          </div>
        ))}
      </div>

      {/* Forecast Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {predictions.map((p, idx) => {
          const style: ChartStyle = chartStyles[idx % chartStyles.length];
          return (
            <div key={p.column} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-foreground">{p.column} — Forecast</h4>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                  {style === "bar" ? "Bar" : style === "combo" ? "Combo" : "Column"}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                {style === "bar" ? (
                  <BarChart data={p.forecastData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" />
                    <YAxis dataKey="period" type="category" tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" width={40} />
                    <Tooltip />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="actual" fill={ACTUAL_COLOR} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="predicted" fill={FORECAST_COLOR} radius={[0, 4, 4, 0]} fillOpacity={0.7} />
                  </BarChart>
                ) : style === "combo" ? (
                  <ComposedChart data={p.forecastData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" />
                    <Tooltip />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="actual" fill={ACTUAL_COLOR} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="predicted" stroke={FORECAST_COLOR} strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 4, fill: FORECAST_COLOR }} connectNulls />
                  </ComposedChart>
                ) : (
                  // Default: clustered column with distinct fills for forecast vs actual
                  <BarChart data={p.forecastData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" />
                    <Tooltip />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="actual" fill={ACTUAL_COLOR} radius={[4, 4, 0, 0]}>
                      {p.forecastData.map((_, i) => (
                        <Cell key={`a-${i}`} fill={ACTUAL_COLOR} />
                      ))}
                    </Bar>
                    <Bar dataKey="predicted" fill={FORECAST_COLOR} radius={[4, 4, 0, 0]} fillOpacity={0.75}>
                      {p.forecastData.map((_, i) => (
                        <Cell key={`p-${i}`} fill={FORECAST_COLOR} fillOpacity={0.75} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2">{p.recommendation}</p>
            </div>
          );
        })}
      </div>

      {/* AI Insight */}
      {aiInsight && (
        <div className="rounded-lg border border-border bg-card p-5 animate-fade-up">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Strategic Recommendations
          </h3>
          <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: aiInsight
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/\n/g, "<br/>"),
            }}
          />
        </div>
      )}
    </div>
  );
}
