import { Sparkles, TrendingUp, BarChart3, PieChart, Activity, Table2, Layers, Filter } from "lucide-react";
import type { ParsedData } from "@/lib/data-processing";

interface SuggestionsPanelProps {
  data: ParsedData | null;
  onPrompt: (prompt: string) => void;
}

const defaultSuggestions = [
  { icon: TrendingUp, label: "Show trends", prompt: "Show a line chart trend over time" },
  { icon: BarChart3, label: "Top categories", prompt: "Top 10 categories by value as bar chart" },
  { icon: PieChart, label: "Distribution", prompt: "Show distribution as pie chart" },
  { icon: Activity, label: "Scatter analysis", prompt: "Create a scatter plot" },
  { icon: Table2, label: "Data summary", prompt: "Show data summary table" },
  { icon: Layers, label: "Stacked view", prompt: "Create a stacked column chart" },
  { icon: Filter, label: "Add slicer", prompt: "Create a slicer filter" },
];

export default function SuggestionsPanel({ data, onPrompt }: SuggestionsPanelProps) {
  const dynamicSuggestions = data
    ? (() => {
        const numCols = data.columns.filter(c => c.type === "number").map(c => c.name);
        const strCols = data.columns.filter(c => c.type === "string").map(c => c.name);
        const suggestions: { icon: typeof TrendingUp; label: string; prompt: string }[] = [];

        if (strCols[0] && numCols[0]) {
          suggestions.push({
            icon: BarChart3,
            label: `${numCols[0]} by ${strCols[0]}`,
            prompt: `Bar chart of ${numCols[0]} by ${strCols[0]}`,
          });
        }
        if (numCols[0]) {
          suggestions.push({
            icon: TrendingUp,
            label: `${numCols[0]} trend`,
            prompt: `Show ${numCols[0]} trend as line chart`,
          });
        }
        if (strCols[0] && numCols[0]) {
          suggestions.push({
            icon: PieChart,
            label: `${strCols[0]} breakdown`,
            prompt: `Distribution of ${numCols[0]} by ${strCols[0]} as pie chart`,
          });
        }
        return suggestions;
      })()
    : [];

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground text-sm">Quick Actions</h3>
      </div>
      <div className="p-3 space-y-1.5">
        {dynamicSuggestions.length > 0 && (
          <>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-1">
              For your data
            </p>
            {dynamicSuggestions.map((s, i) => (
              <button
                key={`d-${i}`}
                onClick={() => onPrompt(s.prompt)}
                className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-left text-xs text-foreground hover:bg-primary/5 hover:text-primary transition-colors group"
              >
                <s.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                {s.label}
              </button>
            ))}
            <div className="border-t border-border my-2" />
          </>
        )}
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-1">
          Common queries
        </p>
        {defaultSuggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onPrompt(s.prompt)}
            className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-left text-xs text-foreground hover:bg-primary/5 hover:text-primary transition-colors group"
          >
            <s.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
