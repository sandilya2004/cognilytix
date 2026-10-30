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

function numericValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/^[₹$€£]\s*/, "").replace(/,/g, "").replace(/%$/, "");
  const normalized = /^\(.*\)$/.test(text) ? `-${text.slice(1, -1)}` : text;
  return normalized !== "" && /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(normalized) ? Number(normalized) : null;
}

function detectType(values: unknown[]): DataColumn["type"] {
  const sample = values.filter((v) => v !== null && v !== undefined && v !== "").slice(0, 50);
  if (sample.length === 0) return "string";

  if (sample.every(v => typeof v === "boolean" || ["true", "false"].includes(String(v).toLowerCase()))) return "boolean";
  const numCount = sample.filter((v) => numericValue(v) !== null).length;
  if (numCount / sample.length > 0.8) return "number";

  const dateCount = sample.filter((v) => !isNaN(Date.parse(String(v)))).length;
  if (dateCount / sample.length > 0.8) return "date";

  const boolCount = sample.filter((v) => ["true", "false", "0", "1"].includes(String(v).toLowerCase())).length;
  if (boolCount / sample.length > 0.9) return "boolean";

  return "string";
}

function cleanHeaders(headers: string[]): string[] {
  const used = new Set<string>();
  return headers.map((h, index) => {
    const base = String(h ?? "").trim().replace(/\s+/g, " ") || `Column_${index + 1}`;
    let name = base;
    let suffix = 2;
    while (used.has(name)) name = `${base}_${suffix++}`;
    used.add(name);
    return name;
  });
}

export function parsedRows(headers: string[], rows: Record<string, unknown>[]): ParsedData {
  const columns = headers.map(name => ({ name, type: detectType(rows.map(row => row[name])) }));
  const normalized = rows.map(row => Object.fromEntries(columns.map(column => {
    const value = row[column.name];
    return [column.name, column.type === "number" ? numericValue(value) ?? value : value instanceof Date ? value.toISOString() : value];
  })));
  return { columns, rows: normalized, rawHeaders: headers };
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
        resolve(parsedRows(headers, rows));
      },
      error: reject,
    });
  });
}

export interface SheetInfo {
  name: string;
  rowCount: number;
  colCount: number;
  preview: Record<string, unknown>[];
  columns: DataColumn[];
}

export function getExcelSheets(file: File): Promise<SheetInfo[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const sheets: SheetInfo[] = wb.SheetNames.map((name) => {
          const sheet = wb.Sheets[name];
          const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][];
          if (raw.length < 1) return { name, rowCount: 0, colCount: 0, preview: [], columns: [] };
          const headers = cleanHeaders(raw[0].map(String));
          const rows = rowsFromSheet(raw);
          const columns: DataColumn[] = headers.map((h) => ({
            name: h,
            type: detectType(rows.map((r) => r[h])),
          }));
          return { name, rowCount: rows.length, colCount: headers.length, preview: rows.slice(0, 3), columns };
        });
        resolve(sheets);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function parseExcelSheet(file: File, sheetName: string): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const sheet = wb.Sheets[sheetName];
        if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
        const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
        const headers = cleanHeaders(((data[0] ?? []) as unknown[]).map(String));
        const rows = rowsFromSheet(data as unknown[][]);
        resolve(parsedRows(headers, rows));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function parseExcel(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
        const headers = cleanHeaders(((data[0] ?? []) as unknown[]).map(String));
        const rows = rowsFromSheet(data as unknown[][]);
        resolve(parsedRows(headers, rows));
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
