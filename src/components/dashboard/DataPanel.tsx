import { Database, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ParsedData } from "@/lib/data-processing";
import { Badge } from "@/components/ui/badge";

interface DataPanelProps {
  data: ParsedData | null;
  fileName: string;
  onUploadClick: () => void;
}

const typeBadge: Record<string, string> = {
  number: "bg-primary/10 text-primary border-primary/20",
  string: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  date: "bg-accent/10 text-accent border-accent/20",
  boolean: "bg-chart-4/10 text-chart-4 border-chart-4/20",
};

export default function DataPanel({ data, fileName, onUploadClick }: DataPanelProps) {
  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center space-y-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mx-auto">
          <Upload className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Upload a dataset to start analyzing</p>
        <Button size="sm" onClick={onUploadClick}>
          <Upload className="h-3.5 w-3.5 mr-1" />
          Upload File
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* File info */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground truncate">{fileName}</span>
        </div>
        <div className="flex gap-2 text-[10px] text-muted-foreground">
          <span>{data.rows.length} rows</span>
          <span>•</span>
          <span>{data.columns.length} cols</span>
        </div>
      </div>

      {/* Column list */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Database className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Columns</span>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {data.columns.map(col => (
            <div
              key={col.name}
              className="flex items-center justify-between px-3 py-1.5 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <span className="text-xs text-foreground truncate mr-2">{col.name}</span>
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 ${typeBadge[col.type] || ""}`}>
                {col.type}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Quick preview */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold text-foreground">Preview (first 5 rows)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-muted/30">
                {data.columns.slice(0, 4).map(col => (
                  <th key={col.name} className="px-2 py-1 text-left font-medium text-foreground whitespace-nowrap">
                    {col.name}
                  </th>
                ))}
                {data.columns.length > 4 && (
                  <th className="px-2 py-1 text-muted-foreground">+{data.columns.length - 4}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.rows.slice(0, 5).map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {data.columns.slice(0, 4).map(col => (
                    <td key={col.name} className="px-2 py-1 text-muted-foreground whitespace-nowrap truncate max-w-[80px]">
                      {row[col.name] != null ? String(row[col.name]) : "—"}
                    </td>
                  ))}
                  {data.columns.length > 4 && <td className="px-2 py-1 text-muted-foreground">…</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
