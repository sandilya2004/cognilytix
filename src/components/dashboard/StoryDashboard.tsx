import { useState } from "react";
import { BookOpen, RefreshCw, Copy, Check, Baby } from "lucide-react";
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
  const [eli10, setEli10] = useState(false);

  const generateStory = async (eli10Mode = eli10) => {
    setLoading(true);
    try {
      const chartsInfo = charts.map(c => `- ${c.title} (${c.type}): X=${c.xKey}, Y=${c.yKey}`).join("\n");
      const colInfo = data.columns.map(c => `${c.name} (${c.type})`).join(", ");
      const sampleRows = data.rows.slice(0, 5).map(r => JSON.stringify(r)).join("\n");

      const audienceInstructions = eli10Mode
        ? `Write this story so a 10-year-old can understand it. Use VERY simple words.
Avoid jargon, percentages without explanation, and technical terms. Use friendly comparisons
and short sentences. Replace business words like "ROI", "segment", "KPI" with plain words.
Each section should feel like a friendly teacher explaining what the numbers mean.`
        : `Write this as a real-time, client-ready presentation script — as if you are speaking
directly to a business client in a meeting. Use a confident, narrative tone with concrete
numbers and business meaning. Each section should be 2-4 sentences of FLOWING PROSE
(not bullet points unless the section explicitly calls for them). Tell a STORY: set the
scene, reveal what's happening, explain why it matters, and what to do next.
Use specific numbers from the data to back up every claim.`;

      const prompt = `You are a senior data storyteller. Build a CLIENT-READY data story from the
dataset and visuals below. The story should sound like something a consultant would say
out loud to a client — not a generic data summary.

${audienceInstructions}

Structure with these markdown sections (use ##):

## 🎯 The Big Picture
Set the scene in 2-3 sentences. What is this dataset about, and why should the client care?

## 🔍 What the Numbers Are Telling Us
The 3-5 most important things found in the data. ${eli10Mode ? "Use comparisons a child would get (like comparing to candy, classrooms, or pizza slices)." : "Reference specific numbers."}

## 📈 Where the Story Is Heading
The clearest trends or patterns — and what they suggest about the near future.

## 💡 What We Recommend Doing
3 concrete next steps the client should take. ${eli10Mode ? "Make each step feel like simple advice from a friend." : "Each should be specific and actionable."}

## ✨ The Bottom Line
One short paragraph the client can quote in a meeting.

---
Data Context:
Columns: ${colInfo}
Total Rows: ${data.rows.length}
Sample rows: ${sampleRows}

Visuals on the dashboard:
${chartsInfo || "(none yet)"}

${summaryText ? `Auto-generated summary:\n${summaryText}` : ""}

Write the FULL story now. Use markdown. Do NOT include the [CREATE_VISUAL] tag.`;

      const { data: aiData, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          messages: [{ role: "user", content: prompt }],
          context: "",
        },
      });

      if (!error && aiData?.response) {
        setStory(aiData.response.replace(/\[CREATE_VISUAL\].*$/s, "").trim());
      } else {
        // Fallback local story
        setStory(generateLocalStory(data, charts, eli10Mode));
      }
    } catch {
      setStory(generateLocalStory(data, charts, eli10Mode));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(story);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleEli10 = () => {
    const next = !eli10;
    setEli10(next);
    if (story) generateStory(next);
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
            Generate a real-time, client-ready data story straight from your visuals and insights —
            ready to read out loud in a meeting.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Button onClick={() => generateStory()} size="lg">
              <BookOpen className="h-4 w-4 mr-2" />
              Create Story
            </Button>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-border accent-primary"
                checked={eli10}
                onChange={(e) => setEli10(e.target.checked)}
              />
              <Baby className="h-3.5 w-3.5" />
              Explain Like I'm 10 mode (optional)
            </label>
          </div>
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
          <p className="text-sm text-muted-foreground">
            {eli10 ? "Rewriting in simple words..." : "Crafting your client-ready story..."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-up">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">Data Story</h3>
              {eli10 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
                  <Baby className="h-3 w-3" />
                  ELI10
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={eli10 ? "default" : "ghost"}
                size="sm"
                onClick={toggleEli10}
                title="Toggle Explain Like I'm 10 mode"
              >
                <Baby className="h-4 w-4 mr-1" />
                ELI10
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => generateStory()}>
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

function generateLocalStory(data: ParsedData, charts: ChartConfig[], eli10 = false): string {
  const numCols = data.columns.filter(c => c.type === "number");
  const catCols = data.columns.filter(c => c.type === "string");
  const lines: string[] = [];

  if (eli10) {
    lines.push("## 🎯 The Big Picture\n");
    lines.push(`We looked at **${data.rows.length} rows** of information with **${data.columns.length} different things** to compare. Think of it like a giant scoreboard with lots of players. We made **${charts.length} pictures** to see who is winning.\n`);
    lines.push("## 🔍 What the Numbers Are Telling Us\n");
  } else {
    lines.push("## 🎯 The Big Picture\n");
    lines.push(`This analysis examines a dataset of **${data.rows.length} records** across **${data.columns.length} fields**. ${charts.length} visualizations were created to uncover patterns and insights.\n`);
    lines.push("## 🔍 What the Numbers Are Telling Us\n");
  }
  for (const col of numCols.slice(0, 3)) {
    const vals = data.rows.map(r => Number(r[col.name]) || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    if (eli10) {
      lines.push(`- The total of **${col.name}** adds up to **${sum.toLocaleString()}**, and on average each row has about **${avg.toFixed(1)}** — like the average score per player.`);
    } else {
      lines.push(`- **${col.name}**: Total ${sum.toLocaleString()}, Average ${avg.toFixed(1)}`);
    }
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
      lines.push(`\n## 📈 Where the Story Is Heading\n`);
      if (eli10) lines.push(`Here are the top winners — the ones with the biggest scores for **${val}**:\n`);
      sorted.slice(0, 5).forEach(([k, v], i) => {
        lines.push(`${i + 1}. **${k}** — ${v.toLocaleString()}`);
      });
    }
  }

  lines.push("\n## 💡 What We Recommend Doing\n");
  if (eli10) {
    lines.push("- Spend more time on the things that are doing great — they bring the most points.");
    lines.push("- Look at the things doing badly and ask: *why aren't they working?*");
    lines.push("- Keep checking the scoreboard often so we know if things get better or worse.\n");
  } else {
    lines.push("- Focus resources on top-performing categories to maximize ROI");
    lines.push("- Investigate underperforming segments for improvement opportunities");
    lines.push("- Continue monitoring key metrics with regular data updates\n");
  }

  lines.push("## ✨ The Bottom Line\n");
  if (eli10) {
    lines.push("The numbers tell a clear story: some things are winning, some need help, and we know where to look next.");
  } else {
    lines.push("The data reveals clear patterns that can drive strategic decisions. Regular analysis will help track progress toward goals.");
  }

  return lines.join("\n");
}
