import { FileText, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SummaryPanelProps {
  summaryText: string;
}

export default function SummaryPanel({ summaryText }: SummaryPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple markdown-to-JSX renderer
  const renderMarkdown = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-bold text-foreground mt-4 mb-2">{line.slice(3)}</h2>;
      if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold text-foreground mt-3 mb-1">{line.slice(4)}</h3>;
      if (line.startsWith("#### ")) return <h4 key={i} className="text-sm font-semibold text-foreground mt-2">{line.slice(5)}</h4>;
      if (line.startsWith("- ")) {
        const content = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <li key={i} className="text-sm text-muted-foreground ml-4 list-disc" dangerouslySetInnerHTML={{ __html: content }} />;
      }
      if (line.trim() === "") return <div key={i} className="h-2" />;
      const content = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <p key={i} className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: content }} />;
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden animate-fade-up">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Detailed Summary & Insights</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="p-5 max-h-[500px] overflow-y-auto">
        {renderMarkdown(summaryText)}
      </div>
    </div>
  );
}
