import { useState, useCallback } from "react";
import { Layers, FileSpreadsheet, BarChart3, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseExcelSheet, type ParsedData, type SheetInfo } from "@/lib/data-processing";
import { toast } from "sonner";

interface SheetSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheets: SheetInfo[];
  file: File | null;
  fileName: string;
  onSheetLoaded: (data: ParsedData, name: string) => void;
}

export default function SheetSelectorDialog({ open, onOpenChange, sheets, file, fileName, onSheetLoaded }: SheetSelectorDialogProps) {
  const [selectedSheet, setSelectedSheet] = useState<string>(sheets[0]?.name || "");
  const [isLoading, setIsLoading] = useState(false);

  const activeSheet = sheets.find((s) => s.name === selectedSheet);

  const handleAnalyze = useCallback(async () => {
    if (!file || !selectedSheet) return;
    setIsLoading(true);
    try {
      const data = await parseExcelSheet(file, selectedSheet);
      if (data.rows.length === 0) {
        toast.error("This sheet appears to be empty.");
      } else {
        onSheetLoaded(data, `${fileName} — ${selectedSheet}`);
        onOpenChange(false);
        toast.success(`Loaded ${data.rows.length} rows from "${selectedSheet}"`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse sheet");
    } finally {
      setIsLoading(false);
    }
  }, [file, selectedSheet, fileName, onSheetLoaded, onOpenChange]);

  if (sheets.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Sheet Selector
            <Badge variant="secondary" className="text-xs">{sheets.length} sheets</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-0 rounded-lg border border-border overflow-hidden">
          {/* Sheet list */}
          <div className="border-r border-border">
            {sheets.map((s) => (
              <button
                key={s.name}
                onClick={() => setSelectedSheet(s.name)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-border last:border-0 ${
                  selectedSheet === s.name ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/40"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.rowCount} rows · {s.colCount} columns</p>
                </div>
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>

          {/* Preview pane */}
          <div className="p-3 space-y-3">
            {activeSheet && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{activeSheet.name}</span>
                </div>
                {activeSheet.preview.length > 0 ? (
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-muted/40">
                          {activeSheet.columns.slice(0, 5).map((col) => (
                            <th key={col.name} className="px-2 py-1.5 text-left font-medium text-foreground whitespace-nowrap">{col.name}</th>
                          ))}
                          {activeSheet.columns.length > 5 && (
                            <th className="px-2 py-1.5 text-muted-foreground">+{activeSheet.columns.length - 5}</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {activeSheet.preview.map((row, i) => (
                          <tr key={i} className="border-t border-border">
                            {activeSheet.columns.slice(0, 5).map((col) => (
                              <td key={col.name} className="px-2 py-1 text-muted-foreground whitespace-nowrap truncate max-w-[100px]">
                                {row[col.name] != null ? String(row[col.name]) : "—"}
                              </td>
                            ))}
                            {activeSheet.columns.length > 5 && <td className="px-2 py-1 text-muted-foreground">…</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">This sheet is empty</p>
                )}
                <Button size="sm" className="w-full" onClick={handleAnalyze} disabled={activeSheet.rowCount === 0 || isLoading}>
                  {isLoading ? (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin mr-1.5" />
                  ) : (
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Analyze "{activeSheet.name}"
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
