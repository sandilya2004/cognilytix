import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import { useState, useMemo } from "react";
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
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return data.rows;
    const q = searchQuery.toLowerCase();
    return data.rows.filter(row =>
      data.columns.some(col => String(row[col.name] ?? "").toLowerCase().includes(q))
    );
  }, [data, searchQuery]);

  const sortedRows = useMemo(() => {
    if (!sortCol) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const av = a[sortCol] ?? "";
      const bv = b[sortCol] ?? "";
      const na = Number(av), nb = Number(bv);
      let cmp: number;
      if (!isNaN(na) && !isNaN(nb)) {
        cmp = na - nb;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredRows, sortCol, sortDir]);

  const totalPages = Math.ceil(sortedRows.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const pageRows = sortedRows.slice(start, start + PAGE_SIZE);

  const handleSort = (colName: string) => {
    if (sortCol === colName) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortCol(colName);
      setSortDir("asc");
    }
    setPage(0);
  };

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
        <>
          {/* Search bar */}
          <div className="px-4 py-2 border-t border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search rows…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-border bg-muted/30">
                  {data.columns.map((col) => (
                    <th
                      key={col.name}
                      className="px-4 py-2.5 text-left font-medium text-foreground whitespace-nowrap cursor-pointer hover:bg-muted/50 transition-colors select-none"
                      onClick={() => handleSort(col.name)}
                    >
                      <div className="flex items-center gap-2">
                        {col.name}
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeBadgeClass[col.type] || ""}`}>
                          {col.type}
                        </Badge>
                        {sortCol === col.name ? (
                          sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />
                        )}
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
                  Rows {start + 1}–{Math.min(start + PAGE_SIZE, sortedRows.length)} of {sortedRows.length}
                  {searchQuery && ` (filtered from ${data.rows.length})`}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-2">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
