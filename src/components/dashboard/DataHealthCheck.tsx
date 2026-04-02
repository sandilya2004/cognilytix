import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ParsedData } from "@/lib/data-processing";
import { toast } from "sonner";

interface DataHealthCheckProps {
  data: ParsedData;
  onDataFixed?: (data: ParsedData) => void;
}

interface Issue {
  type: "missing" | "duplicate" | "dtype" | "outlier" | "empty";
  severity: "high" | "medium" | "low";
  message: string;
  suggestion: string;
  column?: string;
  count?: number;
}

function analyzeHealth(data: ParsedData): Issue[] {
  const issues: Issue[] = [];
  const { columns, rows } = data;
  const total = rows.length;
  if (total === 0) return issues;

  // Sample for large datasets
  const sample = total > 5000 ? rows.slice(0, 5000) : rows;
  const sampleSize = sample.length;

  // Missing values per column
  columns.forEach((col) => {
    const missing = sample.filter(
      (r) => r[col.name] === null || r[col.name] === undefined || r[col.name] === ""
    ).length;
    if (missing > 0) {
      const pct = ((missing / sampleSize) * 100).toFixed(1);
      const severity = missing / sampleSize > 0.3 ? "high" : missing / sampleSize > 0.1 ? "medium" : "low";
      issues.push({
        type: "missing",
        severity,
        column: col.name,
        count: missing,
        message: `${pct}% missing values in "${col.name}" (${missing} of ${sampleSize} rows)`,
        suggestion: "Consider removing rows with missing values or filling them with averages/defaults.",
      });
    }
  });

  // Empty columns (100% missing)
  columns.forEach((col) => {
    const allEmpty = sample.every(
      (r) => r[col.name] === null || r[col.name] === undefined || r[col.name] === ""
    );
    if (allEmpty) {
      issues.push({
        type: "empty",
        severity: "high",
        column: col.name,
        message: `Column "${col.name}" has no useful data`,
        suggestion: "This column can be safely removed — it contains no values.",
      });
    }
  });

  // Duplicate rows
  const seen = new Set<string>();
  let dupes = 0;
  sample.forEach((row) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) dupes++;
    else seen.add(key);
  });
  if (dupes > 0) {
    const severity = dupes / sampleSize > 0.1 ? "high" : dupes / sampleSize > 0.03 ? "medium" : "low";
    issues.push({
      type: "duplicate",
      severity,
      count: dupes,
      message: `${dupes} duplicate rows detected`,
      suggestion: "Remove duplicate rows to improve accuracy and avoid counting things twice.",
    });
  }

  // Data type issues — numbers stored as text
  columns.forEach((col) => {
    if (col.type === "number") return;
    const numLike = sample.filter((r) => {
      const v = r[col.name];
      return v !== null && v !== undefined && v !== "" && !isNaN(Number(v));
    }).length;
    const nonEmpty = sample.filter(
      (r) => r[col.name] !== null && r[col.name] !== undefined && r[col.name] !== ""
    ).length;
    if (nonEmpty > 0 && numLike / nonEmpty > 0.8 && numLike > 5) {
      issues.push({
        type: "dtype",
        severity: "medium",
        column: col.name,
        message: `Column "${col.name}" looks numeric but is stored as text`,
        suggestion: "Convert this column to number format so charts and calculations work correctly.",
      });
    }
  });

  // Basic outlier detection (IQR) for numeric columns
  columns.forEach((col) => {
    if (col.type !== "number") return;
    const vals = sample.map((r) => Number(r[col.name])).filter((v) => !isNaN(v));
    if (vals.length < 10) return;
    vals.sort((a, b) => a - b);
    const q1 = vals[Math.floor(vals.length * 0.25)];
    const q3 = vals[Math.floor(vals.length * 0.75)];
    const iqr = q3 - q1;
    if (iqr === 0) return;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    const outliers = vals.filter((v) => v < lower || v > upper).length;
    if (outliers > 0) {
      const severity = outliers / vals.length > 0.1 ? "high" : outliers / vals.length > 0.03 ? "medium" : "low";
      issues.push({
        type: "outlier",
        severity,
        column: col.name,
        count: outliers,
        message: `${outliers} possible outliers in "${col.name}"`,
        suggestion: "Check these unusual values — they could be errors or genuinely extreme data points.",
      });
    }
  });

  return issues;
}

const severityConfig = {
  high: { icon: "🔴", label: "High", className: "border-red-500/30 bg-red-500/5" },
  medium: { icon: "🟡", label: "Medium", className: "border-amber-500/30 bg-amber-500/5" },
  low: { icon: "🟢", label: "Low", className: "border-green-500/30 bg-green-500/5" },
};

export default function DataHealthCheck({ data, onDataFixed }: DataHealthCheckProps) {
  const issues = useMemo(() => analyzeHealth(data), [data]);
  const [collapsed, setCollapsed] = useState(issues.length === 0);

  const handleFixData = () => {
    let fixedRows = [...data.rows];
    let fixedCols = [...data.columns];
    let fixes = 0;

    // Remove duplicate rows
    const seen = new Set<string>();
    const deduped = fixedRows.filter((row) => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    fixes += fixedRows.length - deduped.length;
    fixedRows = deduped;

    // Remove empty columns
    const emptyCols = fixedCols.filter((col) =>
      fixedRows.every((r) => r[col.name] === null || r[col.name] === undefined || r[col.name] === "")
    );
    if (emptyCols.length > 0) {
      const emptyNames = new Set(emptyCols.map((c) => c.name));
      fixedCols = fixedCols.filter((c) => !emptyNames.has(c.name));
      fixedRows = fixedRows.map((r) => {
        const nr = { ...r };
        emptyNames.forEach((n) => delete nr[n]);
        return nr;
      });
      fixes += emptyCols.length;
    }

    // Fill missing numeric values with column median
    fixedCols.forEach((col) => {
      if (col.type !== "number") return;
      const vals = fixedRows.map((r) => Number(r[col.name])).filter((v) => !isNaN(v));
      if (vals.length === 0) return;
      vals.sort((a, b) => a - b);
      const median = vals[Math.floor(vals.length / 2)];
      fixedRows.forEach((r) => {
        if (r[col.name] === null || r[col.name] === undefined || r[col.name] === "") {
          r[col.name] = median;
          fixes++;
        }
      });
    });

    onDataFixed?.({ columns: fixedCols, rows: fixedRows, rawHeaders: fixedCols.map((c) => c.name) });
    toast.success(`Applied ${fixes} fixes to your data!`);
  };

  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Data Health Check</p>
          <p className="text-xs text-muted-foreground">✅ Your data looks clean and ready for analysis!</p>
        </div>
      </div>
    );
  }

  const highCount = issues.filter((i) => i.severity === "high").length;
  const medCount = issues.filter((i) => i.severity === "medium").length;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-foreground">Data Health Check</span>
          <Badge variant="secondary" className="text-[10px]">{issues.length} issues</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {highCount > 0 && <span className="text-[10px]">🔴 {highCount}</span>}
          {medCount > 0 && <span className="text-[10px]">🟡 {medCount}</span>}
          <span className="text-xs text-muted-foreground">{collapsed ? "▸" : "▾"}</span>
        </div>
      </button>

      {!collapsed && (
        <div className="border-t border-border">
          <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
            {issues.map((issue, i) => {
              const sev = severityConfig[issue.severity];
              return (
                <div key={i} className={`px-4 py-3 ${sev.className}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-sm mt-0.5">{sev.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{issue.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 shrink-0" />
                        {issue.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {onDataFixed && (
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <Button size="sm" variant="outline" className="w-full" onClick={handleFixData}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Fix My Data
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
