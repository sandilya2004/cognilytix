import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { ParsedData } from "@/lib/data-processing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DataPreviewProps {
  data: ParsedData;
  fileName: string;
}

const PAGE_SIZE = 10;

const typeBadgeClass: Record<string, string> = {
  number: "bg-primary/10 text-primary border-primary/20",
  string: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  date: "bg-accent/10 text-accent border-accent/20",
  boolean: "bg-chart-4/10 text-chart-4 border-chart-4/20",
};

export default function DataPreview({ data, fileName }: DataPreviewProps) {
  const [expanded, setExpanded] = useState(true);
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(data.rows.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const pageRows = data.rows.slice(start, start + PAGE_SIZE);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-foreground">Data Preview</h3>
          <span className="text-sm text-muted-foreground">
            {fileName} — {data.rows.length} rows × {data.columns.length} columns
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border bg-muted/30">
                {data.columns.map((col) => (
                  <th key={col.name} className="px-4 py-2.5 text-left font-medium text-foreground whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {col.name}
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeBadgeClass[col.type] || ""}`}>
                        {col.type}
                      </Badge>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, i) => (
                <tr key={start + i} className="border-t border-border hover:bg-muted/20 transition-colors">
                  {data.columns.map((col) => (
                    <td key={col.name} className="px-4 py-2 text-muted-foreground whitespace-nowrap max-w-[200px] truncate">
                      {row[col.name] != null ? String(row[col.name]) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Rows {start + 1}–{Math.min(start + PAGE_SIZE, data.rows.length)} of {data.rows.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
