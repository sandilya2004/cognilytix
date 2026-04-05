import { useState } from "react";
import { BookOpen, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ParsedData } from "@/lib/data-processing";
import type { ChartConfig } from "@/lib/chart-types";
import { supabase } from "@/integrations/supabase/client";

interface StoryDashboardProps {
  data: ParsedData;
  charts: ChartConfig[];
  summaryText: string;
}

export default function StoryDashboard({ data, charts, summaryText }: StoryDashboardProps) {
  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateStory = async () => {
    setLoading(true);
    try {
      const chartsInfo = charts.map(c => `- ${c.title} (${c.type}): X=${c.xKey}, Y=${c.yKey}`).join("\n");
      const colInfo = data.columns.map(c => `${c.name} (${c.type})`).join(", ");
      const sampleRows = data.rows.slice(0, 5).map(r => JSON.stringify(r)).join("\n");

      const prompt = `Based on the following data and visualizations, write a compelling data story that a business analyst would present to stakeholders. Include:

1. **Executive Summary** - One paragraph overview
2. **Key Findings** - 3-5 bullet points of the most important discoveries
3. **Trend Analysis** - What patterns emerge from the data
4. **Recommendations** - 3 actionable business recommendations
5. **Conclusion** - Brief wrap-up

Data Context:
Columns: ${colInfo}
Total Rows: ${data.rows.length}
Sample: ${sampleRows}

Charts Created:
${chartsInfo || "No charts yet"}

${summaryText ? `Existing Summary:\n${summaryText}` : ""}

Write in professional but accessible language. Use markdown formatting.`;

      const { data: aiData, error } = await supabase.functions.invoke("ai-chat", {
        body: { prompt, context: "" },
      });

      if (!error && aiData?.response) {
        setStory(aiData.response);
      } else {
        // Fallback local story
        setStory(generateLocalStory(data, charts));
      }
    } catch {
      setStory(generateLocalStory(data, charts));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(story);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!story && !loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Auto Story Generator</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Automatically create a data-driven narrative from your visuals and insights. Perfect for presentations and reports.
          </p>
          <Button onClick={generateStory} size="lg">
            <BookOpen className="h-4 w-4 mr-2" />
            Create Story
          </Button>
          {charts.length === 0 && (
            <p className="text-xs text-muted-foreground">Tip: Create some charts first for a richer story.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      {loading ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center space-y-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Crafting your data story...</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-up">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Data Story</h3>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="ghost" size="sm" onClick={generateStory}>
                <RefreshCw className="h-4 w-4 mr-1" /> Regenerate
              </Button>
            </div>
          </div>
          <div className="p-5 prose prose-sm max-w-none">
            {renderMarkdown(story)}
          </div>
        </div>
      )}
    </div>
  );
}

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-bold text-foreground mt-4 mb-2">{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold text-foreground mt-3 mb-1">{line.slice(4)}</h3>;
    if (line.startsWith("# ")) return <h2 key={i} className="text-xl font-bold text-foreground mt-4 mb-2">{line.slice(2)}</h2>;
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <li key={i} className="text-sm text-muted-foreground ml-4 list-disc" dangerouslySetInnerHTML={{ __html: content }} />;
    }
    if (/^\d+\.\s/.test(line)) {
      const content = line.replace(/^\d+\.\s/, "").replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <li key={i} className="text-sm text-muted-foreground ml-4 list-decimal" dangerouslySetInnerHTML={{ __html: content }} />;
    }
    if (line.trim() === "") return <div key={i} className="h-2" />;
    const content = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return <p key={i} className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />;
  });
}

function generateLocalStory(data: ParsedData, charts: ChartConfig[]): string {
  const numCols = data.columns.filter(c => c.type === "number");
  const catCols = data.columns.filter(c => c.type === "string");
  const lines: string[] = [];

  lines.push("## Executive Summary\n");
  lines.push(`This analysis examines a dataset of **${data.rows.length} records** across **${data.columns.length} fields**. ${charts.length} visualizations were created to uncover patterns and insights.\n`);

  lines.push("## Key Findings\n");
  for (const col of numCols.slice(0, 3)) {
    const vals = data.rows.map(r => Number(r[col.name]) || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    lines.push(`- **${col.name}**: Total ${sum.toLocaleString()}, Average ${avg.toFixed(1)}`);
  }

  if (catCols.length > 0 && numCols.length > 0) {
    const cat = catCols[0].name;
    const val = numCols[0].name;
    const groups = new Map<string, number>();
    for (const r of data.rows) {
      const k = String(r[cat] ?? "");
      groups.set(k, (groups.get(k) || 0) + (Number(r[val]) || 0));
    }
    const sorted = [...groups.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      lines.push(`\n## Top Performers\n`);
      sorted.slice(0, 5).forEach(([k, v], i) => {
        lines.push(`${i + 1}. **${k}** — ${v.toLocaleString()}`);
      });
    }
  }

  lines.push("\n## Recommendations\n");
  lines.push("- Focus resources on top-performing categories to maximize ROI");
  lines.push("- Investigate underperforming segments for improvement opportunities");
  lines.push("- Continue monitoring key metrics with regular data updates\n");

  lines.push("## Conclusion\n");
  lines.push("The data reveals clear patterns that can drive strategic decisions. Regular analysis will help track progress toward goals.");

  return lines.join("\n");
}
