import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { ChartConfig } from "@/lib/chart-types";
import type { ParsedData } from "@/lib/data-processing";

export interface ReportPayload {
  title: string;
  fileName: string;
  data: ParsedData | null;
  charts: ChartConfig[];
  executiveSummary?: string;
  insights?: string[];
  opportunities?: string[];
  problems?: string[];
  recommendations?: string[];
  predictions?: string[];
  predictionAI?: string;
  predictionInsights?: string[];
  story?: string;
}

export const CHART_SELECTOR =
  "#chart-grid > div, #auto-dashboard-root, #prediction-panel-root .recharts-responsive-container";

const NAVY: [number, number, number] = [30, 39, 97];
const INK: [number, number, number] = [33, 41, 60];
const MUTED: [number, number, number] = [110, 119, 138];
const ACCENT: [number, number, number] = [79, 70, 229];

export function cleanText(s: string): string {
  return s
    .replace(/[•▪●▶✓]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function fmtNum(n: number): string {
  if (!isFinite(n)) return "-";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2).replace(/\.00$/, "");
}

export function computeKPIs(data: ParsedData) {
  const numericCols = data.columns.filter((c) => c.type === "number").map((c) => c.name);
  const stringCols = data.columns.filter((c) => c.type === "string").map((c) => c.name);
  const find = (cols: string[], keys: string[]) =>
    cols.find((n) => keys.some((k) => n.toLowerCase().includes(k))) ?? null;
  const revCol = find(numericCols, ["revenue", "sales", "amount", "total", "income"]) ?? numericCols[0];
  const profCol = find(numericCols, ["profit", "margin", "net"]);
  const regionCol = find(stringCols, ["region", "country", "state", "city"]);
  const productCol = find(stringCols, ["product", "item", "sku", "name", "category"]);
  const sum = (col: string | null | undefined) =>
    col ? data.rows.reduce((s, r) => s + (Number(r[col]) || 0), 0) : 0;
  const growthPct = (() => {
    if (!revCol || data.rows.length < 4) return null;
    const half = Math.floor(data.rows.length / 2);
    const a = data.rows.slice(0, half).reduce((s, r) => s + (Number(r[revCol]) || 0), 0);
    const b = data.rows.slice(half).reduce((s, r) => s + (Number(r[revCol]) || 0), 0);
    return a === 0 ? null : ((b - a) / a) * 100;
  })();
  const bestBy = (catCol: string | null) => {
    if (!catCol || !revCol) return null;
    const m = new Map<string, number>();
    for (const r of data.rows) {
      const k = String(r[catCol] ?? "Unknown");
      m.set(k, (m.get(k) || 0) + (Number(r[revCol]) || 0));
    }
    return Array.from(m.entries()).sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
  };
  return {
    cards: [
      { label: `Total ${revCol ?? "Value"}`, value: fmtNum(sum(revCol)) },
      { label: `Total ${profCol ?? "Profit"}`, value: profCol ? fmtNum(sum(profCol)) : "-" },
      { label: "Growth %", value: growthPct == null ? "-" : `${growthPct.toFixed(1)}%` },
      { label: "Best Region", value: bestBy(regionCol) ?? "-" },
      { label: "Best Product", value: bestBy(productCol) ?? "-" },
      { label: "Total Records", value: fmtNum(data.rows.length) },
    ],
  };
}

export async function captureCharts(max = 10): Promise<{ img: string; ratio: number }[]> {
  const els = Array.from(document.querySelectorAll<HTMLElement>(CHART_SELECTOR)).filter(
    (el) => el.offsetWidth > 0 && el.offsetHeight > 0,
  );
  const out: { img: string; ratio: number }[] = [];
  for (const el of els.slice(0, max)) {
    try {
      const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false });
      if (!canvas.width || !canvas.height) continue;
      out.push({ img: canvas.toDataURL("image/png"), ratio: canvas.width / canvas.height });
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function generateExecutivePDF(payload: ReportPayload): Promise<Blob> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const M = 14;
  const W = pw - M * 2;
  const title = cleanText(payload.title);
  let y = 25;

  const newPage = () => {
    pdf.addPage();
    pdf.setFillColor(...NAVY);
    pdf.rect(0, 0, pw, 14, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("COGNILYTIX", M, 9);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(title, pw / 2, 9, { align: "center" });
    pdf.setDrawColor(220, 224, 232);
    pdf.line(M, ph - 12, pw - M, ph - 12);
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED);
    pdf.text(`Generated by Cognilytix AI - ${new Date().toLocaleDateString()}`, M, ph - 6);
    pdf.setTextColor(...INK);
    y = 25;
  };
  const ensure = (h: number) => { if (y + h > ph - 18) newPage(); };

  const section = (text: string) => {
    ensure(20);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(...NAVY);
    pdf.text(text, M, y);
    pdf.setDrawColor(...ACCENT);
    pdf.setLineWidth(0.8);
    pdf.line(M, y + 1.5, M + 26, y + 1.5);
    pdf.setLineWidth(0.2);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...INK);
    y += 9;
  };

  const paragraph = (text: string) => {
    pdf.setFontSize(10);
    pdf.setTextColor(...INK);
    for (const para of cleanText(text).split(/\n\s*\n|\n/).filter(Boolean)) {
      const lines = pdf.splitTextToSize(para, W) as string[];
      for (const l of lines) { ensure(5); pdf.text(l, M, y); y += 5; }
      y += 2;
    }
    y += 2;
  };

  const bullets = (items: string[]) => {
    pdf.setFontSize(10);
    for (const raw of items) {
      const t = cleanText(raw).replace(/^-\s*/, "");
      if (!t) continue;
      const lines = pdf.splitTextToSize(t, W - 6) as string[];
      ensure(lines.length * 5 + 2);
      pdf.setFillColor(...ACCENT);
      pdf.circle(M + 2, y - 1.5, 0.9, "F");
      pdf.setTextColor(...INK);
      for (const l of lines) { pdf.text(l, M + 6, y); y += 5; }
      y += 2;
    }
    y += 3;
  };

  // ---------- COVER ----------
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pw, ph, "F");
  pdf.setFillColor(...ACCENT);
  pdf.rect(0, ph * 0.55, pw, ph * 0.02, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(32);
  pdf.text(pdf.splitTextToSize(title, W) as string[], pw / 2, ph * 0.4, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(14);
  pdf.setTextColor(202, 220, 252);
  pdf.text("Executive Business Report", pw / 2, ph * 0.5, { align: "center" });
  pdf.setFontSize(11);
  pdf.text(`Dataset: ${cleanText(payload.fileName || "-")}`, pw / 2, ph * 0.62, { align: "center" });
  pdf.text(`Generated: ${new Date().toLocaleDateString(undefined, { dateStyle: "long" })}`, pw / 2, ph * 0.66, { align: "center" });

  // ---------- KPIs ----------
  newPage();
  section("Performance Snapshot");
  if (payload.data) {
    const { cards } = computeKPIs(payload.data);
    const cardW = (W - 12) / 3, cardH = 26;
    cards.forEach((c, i) => {
      const x = M + (i % 3) * (cardW + 6);
      const cy = y + Math.floor(i / 3) * (cardH + 6);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(x, cy, cardW, cardH, 2, 2, "F");
      pdf.setFillColor(...ACCENT);
      pdf.rect(x, cy, 1.5, cardH, "F");
      pdf.setFontSize(8);
      pdf.setTextColor(...MUTED);
      pdf.text((pdf.splitTextToSize(cleanText(c.label).toUpperCase(), cardW - 8) as string[])[0], x + 5, cy + 7);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(...INK);
      pdf.text((pdf.splitTextToSize(cleanText(c.value), cardW - 8) as string[])[0], x + 5, cy + 18);
      pdf.setFont("helvetica", "normal");
    });
    y += 2 * (cardH + 6) + 4;
  }

  if (payload.executiveSummary) { section("Executive Summary"); paragraph(payload.executiveSummary); }

  // ---------- CHARTS ----------
  const charts = await captureCharts(10);
  if (charts.length) {
    newPage();
    section("Charts & Visualizations");
    for (const c of charts) {
      let w = W, h = w / c.ratio;
      if (h > 110) { h = 110; w = h * c.ratio; }
      ensure(h + 6);
      pdf.addImage(c.img, "PNG", M + (W - w) / 2, y, w, h);
      y += h + 6;
    }
  }

  const has = (a?: string[]) => !!a && a.length > 0;
  if (payload.insights?.length) { newPage(); section("AI Insights"); bullets(payload.insights); }
  if (payload.opportunities?.length) { section("Growth Opportunities"); bullets(payload.opportunities); }
  if (payload.problems?.length) { section("Problems & Risk Areas"); bullets(payload.problems); }

  if (has(payload.predictions) || payload.predictionAI || has(payload.predictionInsights)) {
    newPage();
    if (payload.predictions?.length) { section("Predictions"); bullets(payload.predictions); }
    if (payload.predictionAI) { section("AI Forecast Commentary"); paragraph(payload.predictionAI); }
    if (payload.predictionInsights?.length) { section("Prediction Insights"); bullets(payload.predictionInsights); }
  }

  if (payload.recommendations?.length) { section("Recommendations"); bullets(payload.recommendations); }

  if (payload.story) { newPage(); section("Data Story"); paragraph(payload.story); }

  // Page numbers
  const total = pdf.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`${i} / ${total}`, pw - M, 9, { align: "right" });
  }

  return pdf.output("blob");
}

export async function downloadExecutivePDF(payload: ReportPayload) {
  const blob = await generateExecutivePDF(payload);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${payload.title.replace(/[^a-z0-9]+/gi, "_")}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
