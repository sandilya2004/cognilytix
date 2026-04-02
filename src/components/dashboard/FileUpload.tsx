import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, X, FileText, Table2, BarChart3, Clock, Layers, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseFile, getExcelSheets, parseExcelSheet, type ParsedData, type SheetInfo } from "@/lib/data-processing";
import { toast } from "sonner";

interface FileUploadProps {
  onDataLoaded: (data: ParsedData, fileName: string) => void;
  onSheetsDetected?: (sheets: SheetInfo[], file: File, fileName: string) => void;
}

const FILE_TYPES = [
  { label: "Excel (.xlsx)", icon: FileSpreadsheet, accept: ".xlsx,.xls", color: "text-green-600 bg-green-500/10 border-green-500/20" },
  { label: "CSV", icon: Table2, accept: ".csv", color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  { label: "PDF Tables", icon: FileText, accept: ".pdf", color: "text-red-600 bg-red-500/10 border-red-500/20" },
  { label: "Power BI (.pbix)", icon: BarChart3, accept: ".pbix", color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
];

function isExcelFile(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "xlsx" || ext === "xls";
}

export default function FileUpload({ onDataLoaded, onSheetsDetected }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setFileName(file.name);
      setSheets([]);
      setSelectedSheet(null);
      setExcelFile(null);

      try {
        if (isExcelFile(file.name)) {
          const sheetList = await getExcelSheets(file);
          if (sheetList.length > 1) {
            setSheets(sheetList);
            setSelectedSheet(sheetList[0].name);
            setExcelFile(file);
            setIsLoading(false);
            return;
          }
        }
        const data = await parseFile(file);
        if (data.rows.length === 0) {
          toast.error("The file appears to be empty.");
          setFileName(null);
        } else {
          onDataLoaded(data, file.name);
          toast.success(`Loaded ${data.rows.length} rows with ${data.columns.length} columns`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to parse file");
        setFileName(null);
      } finally {
        setIsLoading(false);
      }
    },
    [onDataLoaded]
  );

  const handleAnalyzeSheet = useCallback(async () => {
    if (!excelFile || !selectedSheet) return;
    setIsLoading(true);
    try {
      const data = await parseExcelSheet(excelFile, selectedSheet);
      if (data.rows.length === 0) {
        toast.error("This sheet appears to be empty.");
      } else {
        onDataLoaded(data, `${fileName} — ${selectedSheet}`);
        toast.success(`Loaded ${data.rows.length} rows from "${selectedSheet}"`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse sheet");
    } finally {
      setIsLoading(false);
    }
  }, [excelFile, selectedSheet, fileName, onDataLoaded]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const openFilePicker = (accept: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  };

  const trialDaysLeft = 24;
  const activeSheet = sheets.find((s) => s.name === selectedSheet);

  return (
    <div className="space-y-4">
      {/* Trial Countdown Banner */}
      <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-700">Free Trial</span>
          <span className="text-sm text-amber-600">{trialDaysLeft} days remaining</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-32 rounded-full bg-amber-200 overflow-hidden">
            <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${((30 - trialDaysLeft) / 30) * 100}%` }} />
          </div>
          <a href="/payment?plan=Pro" className="text-xs font-medium text-primary hover:underline">Upgrade</a>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Processing {fileName}…</p>
          </div>
        ) : sheets.length > 0 ? null : fileName ? (
          <div className="flex items-center justify-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="font-medium text-foreground">{fileName}</p>
              <p className="text-xs text-muted-foreground">File loaded successfully</p>
            </div>
            <Button variant="ghost" size="icon" className="ml-2" onClick={() => setFileName(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Drop your dataset here or choose a format below</p>
              <p className="mt-1 text-sm text-muted-foreground">Supports Excel, CSV, PDF tables & Power BI datasets</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
              {FILE_TYPES.map((ft) => (
                <button
                  key={ft.label}
                  onClick={() => openFilePicker(ft.accept)}
                  className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-all hover:scale-105 hover:shadow-sm cursor-pointer ${ft.color}`}
                >
                  <ft.icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{ft.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sheet Selector */}
      {sheets.length > 0 && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">{fileName}</span>
              <Badge variant="secondary" className="text-[10px]">{sheets.length} sheets</Badge>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSheets([]); setFileName(null); setExcelFile(null); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-0">
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
                  <Button size="sm" className="w-full" onClick={handleAnalyzeSheet} disabled={activeSheet.rowCount === 0}>
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                    Analyze "{activeSheet.name}"
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
