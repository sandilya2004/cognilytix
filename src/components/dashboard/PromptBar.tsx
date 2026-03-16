import { useState, useRef } from "react";
import { Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromptBarProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

const suggestions = [
  "Create a bar chart of sales by region",
  "Show monthly revenue trend",
  "Top 10 products by profit",
  "Distribution of customer ages",
];

export default function PromptBar({ onSubmit, isLoading, disabled }: PromptBarProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  };

  return (
    <div className="space-y-3">
      <div
        className={`flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-all ${
          focused ? "border-primary prompt-glow" : "border-border"
        }`}
      >
        <Sparkles className="h-5 w-5 text-primary shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder={disabled ? "Upload a dataset first…" : "Ask anything about your data…"}
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <Button
          size="sm"
          disabled={disabled || !value.trim() || isLoading}
          onClick={handleSubmit}
        >
          {isLoading ? (
            <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {!disabled && !value && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => {
                setValue(s);
                inputRef.current?.focus();
              }}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
