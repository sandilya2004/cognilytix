import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface DataColumn {
  name: string;
  type: "string" | "number" | "date" | "boolean";
}

export interface ParsedData {
  columns: DataColumn[];
  rows: Record<string, unknown>[];
  rawHeaders: string[];
}

function detectType(values: unknown[]): DataColumn["type"] {
  const sample = values.filter((v) => v !== null && v !== undefined && v !== "").slice(0, 50);
  if (sample.length === 0) return "string";

  const numCount = sample.filter((v) => !isNaN(Number(v))).length;
  if (numCount / sample.length > 0.8) return "number";

  const dateCount = sample.filter((v) => !isNaN(Date.parse(String(v)))).length;
  if (dateCount / sample.length > 0.8) return "date";

  const boolCount = sample.filter((v) => ["true", "false", "0", "1"].includes(String(v).toLowerCase())).length;
  if (boolCount / sample.length > 0.9) return "boolean";

  return "string";
}

function cleanHeaders(headers: string[]): string[] {
  return headers.map((h) => String(h).trim().replace(/\s+/g, " ") || `Column_${Math.random().toString(36).slice(2, 6)}`);
}

function rowsFromSheet(data: unknown[][]): Record<string, unknown>[] {
  if (data.length < 2) return [];
  const headers = cleanHeaders(data[0].map(String));
  return data.slice(1).map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = (row as unknown[])[i] ?? null;
    });
    return obj;
  });
}

export function parseCSV(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete(results) {
        const rawHeaders = results.meta.fields ?? [];
        const headers = cleanHeaders(rawHeaders);
        const rows = (results.data as Record<string, unknown>[]).map((row) => {
          const clean: Record<string, unknown> = {};
          rawHeaders.forEach((h, i) => {
            clean[headers[i]] = row[h];
          });
          return clean;
        });
        const columns: DataColumn[] = headers.map((name) => ({
          name,
          type: detectType(rows.map((r) => r[name])),
        }));
        resolve({ columns, rows, rawHeaders: headers });
      },
      error: reject,
    });
  });
}

export function parseExcel(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
        const headers = cleanHeaders((data[0] as unknown[]).map(String));
        const rows = rowsFromSheet(data as unknown[][]);
        const columns: DataColumn[] = headers.map((name) => ({
          name,
          type: detectType(rows.map((r) => r[name])),
        }));
        resolve({ columns, rows, rawHeaders: headers });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export async function parseFile(file: File): Promise<ParsedData> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return parseCSV(file);
  if (ext === "xlsx" || ext === "xls") return parseExcel(file);
  throw new Error(`Unsupported file type: .${ext}`);
}
