import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, X, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseFile, getExcelSheets, type ParsedData, type SheetInfo } from "@/lib/data-processing";
import { toast } from "sonner";

interface FileUploadProps {
  onDataLoaded: (data: ParsedData, fileName: string) => void;
  onSheetsDetected?: (sheets: SheetInfo[], file: File, fileName: string) => void;
}

const FILE_TYPES = [
  { label: "Excel (.xlsx)", icon: FileSpreadsheet, accept: ".xlsx,.xls", color: "text-green-600 bg-green-500/10 border-green-500/20" },
  { label: "CSV", icon: Table2, accept: ".csv", color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
];

function isExcelFile(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "xlsx" || ext === "xls";
}

export default function FileUpload({ onDataLoaded, onSheetsDetected }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setFileName(file.name);
      try {
        if (isExcelFile(file.name)) {
          const sheetList = await getExcelSheets(file);
          if (sheetList.length > 1) {
            onSheetsDetected?.(sheetList, file, file.name);
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
    [onDataLoaded, onSheetsDetected]
  );

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

  return (
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
      ) : fileName ? (
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
            <p className="mt-1 text-sm text-muted-foreground">Supports Excel and CSV files</p>
          </div>
          <div className="flex gap-4 w-full max-w-xs">
            {FILE_TYPES.map((ft) => (
              <button
                key={ft.label}
                onClick={() => openFilePicker(ft.accept)}
                className={`flex-1 flex flex-col items-center gap-2 rounded-lg border p-4 transition-all hover:scale-105 hover:shadow-sm cursor-pointer ${ft.color}`}
              >
                <ft.icon className="h-6 w-6" />
                <span className="text-xs font-medium">{ft.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
