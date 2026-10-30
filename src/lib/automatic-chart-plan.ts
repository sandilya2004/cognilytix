import type { ParsedData } from "./data-processing";

export type AutomaticSpec =
  | { kind: "trend"; val: string; val2: string | null }
  | { kind: "cumulative"; val: string }
  | { kind: "hbar" | "vbar" | "pie"; cat: string; val: string }
  | { kind: "comp"; cat: string; vals: string[] };

export const RECORD_COUNT = "Record count";
export const ROW_CATEGORY = "Record number";

export function buildAutomaticPlan(data: ParsedData): AutomaticSpec[] {
  const numeric = data.columns.filter(c => c.type === "number" && !/(^|[\s_-])id$|^id$|code|zip|postal|phone|year/i.test(c.name)).map(c => c.name);
  const measures = numeric.length ? numeric : [RECORD_COUNT];
  const primary = measures.find(n => /revenue|sales|amount|income/i.test(n)) ?? measures[0];
  const second = measures.find(n => n !== primary) ?? null;
  const date = data.columns.find(c => c.type === "date");
  const categories = data.columns.filter(c => c.type === "string" || c.type === "boolean")
    .map(c => ({ name: c.name, count: new Set(data.rows.map(r => String(r[c.name] ?? "Unknown"))).size }))
    .sort((a, b) => Number(a.count > 60) - Number(b.count > 60))
    .map(c => c.name);
  const groups = categories.length ? categories : [date?.name ?? ROW_CATEGORY];
  const result: AutomaticSpec[] = [];
  if (date) result.push({ kind: "trend", val: primary, val2: second });
  result.push({ kind: "hbar", cat: groups[0], val: primary });
  result.push({ kind: "pie", cat: groups[1] ?? groups[0], val: primary });
  if (second) result.push({ kind: "comp", cat: groups[0], vals: [primary, second] });
  if (date) result.push({ kind: "cumulative", val: primary });
  for (const val of measures) {
    for (const cat of groups) {
      for (const kind of ["vbar", "hbar", "pie"] as const) {
        if (!result.some(s => s.kind === kind && "cat" in s && s.cat === cat && "val" in s && s.val === val)) {
          result.push({ kind, cat, val });
        }
      }
    }
  }
  // Extra views use each measure's individual records, rather than duplicating charts.
  for (const val of measures) {
    if (groups.includes(ROW_CATEGORY)) continue;
    result.push({ kind: "vbar", cat: ROW_CATEGORY, val });
    result.push({ kind: "hbar", cat: ROW_CATEGORY, val });
  }
  if (numeric.length) {
    for (const cat of groups) {
      result.push({ kind: "vbar", cat, val: RECORD_COUNT });
      result.push({ kind: "pie", cat, val: RECORD_COUNT });
    }
  }
  return result;
}

export function nextAutomaticCount(current: number, available: number): number {
  return Math.min(current + 3, available);
}