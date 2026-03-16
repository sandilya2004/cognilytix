import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseFile, type ParsedData } from "@/lib/data-processing";
import { toast } from "sonner";

interface FileUploadProps {
  onDataLoaded: (data: ParsedData, fileName: string) => void;
}

export default function FileUpload({ onDataLoaded }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setFileName(file.name);
      try {
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

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-border"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
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
          <Button
            variant="ghost"
            size="icon"
            className="ml-2"
            onClick={() => setFileName(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="cursor-pointer flex flex-col items-center gap-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Drop your dataset here or click to browse</p>
            <p className="mt-1 text-sm text-muted-foreground">Supports CSV, Excel (.xlsx), and XLS files</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".csv,.xlsx,.xls"
            onChange={onSelect}
          />
        </label>
      )}
    </div>
  );
}
