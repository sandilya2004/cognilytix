import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ParsedData } from "@/lib/data-processing";

interface DataHealthCheckProps {
  data: ParsedData;
}

interface Issue {
  type: "missing" | "duplicate" | "dtype" | "outlier" | "empty" | "formatting";
  severity: "high" | "medium" | "low";
  title: string;
  message: string;
  excelFix: string[];
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
        title: `Missing Values in "${col.name}"`,
        message: `${pct}% of rows are blank (${missing} of ${sampleSize}).`,
        excelFix: [
          `Select the "${col.name}" column header.`,
          "On the Data tab, click Filter, then open the column's filter and tick (Blanks).",
          "Fill the blank cells manually, or use a formula like =IFERROR(AVERAGE(range),0) for numeric data.",
          "Remove the filter when done (Data → Clear).",
        ],
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
        title: `Empty Column "${col.name}"`,
        message: "This column contains no values at all.",
        excelFix: [
          `Right-click the "${col.name}" column header in Excel.`,
          "Choose Delete to remove the column entirely.",
          "Save the file and re-upload.",
        ],
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
      title: "Duplicate Rows Found",
      message: `${dupes} fully duplicated rows detected.`,
      excelFix: [
        "Select your full data range (Ctrl+A inside the table).",
        "Go to Data → Remove Duplicates.",
        "Keep all columns ticked and click OK.",
        "Save and re-upload the cleaned file.",
      ],
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
        title: `Incorrect Data Type in "${col.name}"`,
        message: "Values look like numbers but are stored as text — charts and math won't work correctly.",
        excelFix: [
          `Select the "${col.name}" column.`,
          "Press Ctrl+1 to open Format Cells.",
          "Choose Number (or Currency) and click OK.",
          "If values still show as text, type 1 in an empty cell, copy it, select the column, and use Paste Special → Multiply.",
        ],
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
        title: `Possible Outliers in "${col.name}"`,
        message: `${outliers} values are far outside the typical range — could be errors or genuine extremes.`,
        excelFix: [
          `Sort the "${col.name}" column from largest to smallest (Data → Sort).`,
          "Inspect the top and bottom values for typos or wrong units.",
          "Correct or delete invalid rows. Keep them if they're genuine.",
          "You can also use Conditional Formatting → Top/Bottom Rules to highlight extremes.",
        ],
      });
    }
  });

  // Inconsistent formatting in string columns (mixed casing / leading-trailing spaces)
  columns.forEach((col) => {
    if (col.type !== "string") return;
    const seenVals = new Map<string, Set<string>>();
    sample.forEach((r) => {
      const v = r[col.name];
      if (v === null || v === undefined || v === "") return;
      const raw = String(v);
      const norm = raw.trim().toLowerCase();
      if (!seenVals.has(norm)) seenVals.set(norm, new Set());
      seenVals.get(norm)!.add(raw);
    });
    let inconsistencies = 0;
    seenVals.forEach((forms) => {
      if (forms.size > 1) inconsistencies++;
    });
    if (inconsistencies >= 3) {
      issues.push({
        type: "formatting",
        severity: inconsistencies > 10 ? "medium" : "low",
        column: col.name,
        count: inconsistencies,
        title: `Inconsistent Formatting in "${col.name}"`,
        message: `${inconsistencies} values have multiple variants (different casing or extra spaces).`,
        excelFix: [
          `Select the "${col.name}" column.`,
          "Use Find & Replace (Ctrl+H) to standardize casing or remove extra spaces.",
          "Or insert a helper column with =TRIM(PROPER(A2)) and copy-paste values back.",
        ],
      });
    }
  });

  return issues;
}

const severityConfig = {
  high: { icon: "🔴", label: "High Severity", className: "border-l-4 border-l-red-500 bg-red-500/5" },
  medium: { icon: "🟡", label: "Medium Severity", className: "border-l-4 border-l-amber-500 bg-amber-500/5" },
  low: { icon: "🟢", label: "Low Severity", className: "border-l-4 border-l-green-500 bg-green-500/5" },
};

export default function DataHealthCheck({ data }: DataHealthCheckProps) {
  const issues = useMemo(() => analyzeHealth(data), [data]);

  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-6 flex items-center gap-4">
        <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
        <div>
          <p className="text-base font-semibold text-foreground">Data Health Check</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            ✅ No major data quality issues detected. Your data looks clean and ready for analysis!
          </p>
        </div>
      </div>
    );
  }

  const highCount = issues.filter((i) => i.severity === "high").length;
  const medCount = issues.filter((i) => i.severity === "medium").length;
  const lowCount = issues.filter((i) => i.severity === "low").length;

  return (
    <div className="space-y-4">
      {/* Header summary */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-foreground">Data Health Check</p>
            <p className="text-xs text-muted-foreground">
              {issues.length} issue{issues.length === 1 ? "" : "s"} detected — review and fix manually in Excel.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {highCount > 0 && <Badge variant="outline" className="border-red-500/40 text-red-600 dark:text-red-400">🔴 {highCount} High</Badge>}
          {medCount > 0 && <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">🟡 {medCount} Medium</Badge>}
          {lowCount > 0 && <Badge variant="outline" className="border-green-500/40 text-green-600 dark:text-green-400">🟢 {lowCount} Low</Badge>}
        </div>
      </div>

      {/* Issue cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {issues.map((issue, i) => {
          const sev = severityConfig[issue.severity];
          return (
            <div key={i} className={`rounded-lg border border-border bg-card overflow-hidden ${sev.className}`}>
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{sev.icon}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{sev.label}</span>
                </div>
                <p className="text-sm font-semibold text-foreground">{issue.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{issue.message}</p>
              </div>
              <div className="border-t border-border bg-background/50 px-4 py-3">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
                  <Wrench className="h-3.5 w-3.5 text-primary" />
                  How to fix in Excel
                </p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground leading-relaxed">
                  {issue.excelFix.map((step, j) => (
                    <li key={j}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
