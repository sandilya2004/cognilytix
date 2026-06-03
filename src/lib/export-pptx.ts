import pptxgen from "pptxgenjs";
import html2canvas from "html2canvas";
import type { ReportPayload } from "./export-pdf";

const NAVY = "1E2761";
const NAVY_DEEP = "0F1B3D";
const ACCENT = "4F46E5";
const INK = "21293C";
const MUTED = "6E778A";
const SOFT = "F8FAFC";

function fmtNum(n: number): string {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

function addFooter(slide: pptxgen.Slide, page: number, total: number) {
  slide.addText(`Cognilytix · ${new Date().toLocaleDateString()}`, {
    x: 0.4, y: 7.1, w: 5, h: 0.3, fontSize: 10, color: MUTED, fontFace: "Calibri",
  });
  slide.addText(`${page} / ${total}`, {
    x: 12.1, y: 7.1, w: 1, h: 0.3, fontSize: 10, color: MUTED, align: "right", fontFace: "Calibri",
  });
}

function addAccentBar(slide: pptxgen.Slide) {
  slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.15, fill: { color: ACCENT } });
}

export async function generateExecutivePPTX(payload: ReportPayload): Promise<Blob> {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pres.title = payload.title;

  // ---- Slide 1: Title ----
  const s1 = pres.addSlide();
  s1.background = { color: NAVY_DEEP };
  s1.addShape("rect", { x: 0, y: 3.4, w: 13.33, h: 0.08, fill: { color: ACCENT } });
  s1.addText(payload.title, {
    x: 0.8, y: 2.4, w: 11.7, h: 1, fontSize: 48, bold: true, color: "FFFFFF", fontFace: "Calibri",
  });
  s1.addText("Executive Business Report", {
    x: 0.8, y: 3.6, w: 11.7, h: 0.6, fontSize: 22, color: "CADCFC", fontFace: "Calibri",
  });
  s1.addText(`Dataset: ${payload.fileName || "—"}`, {
    x: 0.8, y: 5.5, w: 11.7, h: 0.4, fontSize: 16, color: "CADCFC", fontFace: "Calibri",
  });
  s1.addText(`Generated: ${new Date().toLocaleDateString(undefined, { dateStyle: "long" })}`, {
    x: 0.8, y: 6.0, w: 11.7, h: 0.4, fontSize: 14, color: "94A3B8", fontFace: "Calibri",
  });
  s1.addText("Powered by Cognilytix AI", {
    x: 0.8, y: 6.9, w: 11.7, h: 0.3, fontSize: 11, color: "64748B", fontFace: "Calibri",
  });

  // ---- Slide 2: Executive Summary ----
  const s2 = pres.addSlide();
  s2.background = { color: "FFFFFF" };
  addAccentBar(s2);
  s2.addText("Executive Summary", {
    x: 0.5, y: 0.4, w: 12, h: 0.7, fontSize: 32, bold: true, color: NAVY, fontFace: "Calibri",
  });
  s2.addText(payload.executiveSummary || "AI executive summary unavailable. Use the Generate Executive Report button to create one.", {
    x: 0.5, y: 1.3, w: 12.3, h: 5.5, fontSize: 16, color: INK, fontFace: "Calibri", valign: "top",
  });
  addFooter(s2, 2, 8);

  // ---- Slide 3: KPI Cards ----
  const s3 = pres.addSlide();
  s3.background = { color: SOFT };
  addAccentBar(s3);
  s3.addText("Key Performance Indicators", {
    x: 0.5, y: 0.4, w: 12, h: 0.7, fontSize: 32, bold: true, color: NAVY, fontFace: "Calibri",
  });

  if (payload.data) {
    const numericCols = payload.data.columns.filter((c) => c.type === "number").map((c) => c.name);
    const stringCols = payload.data.columns.filter((c) => c.type === "string").map((c) => c.name);
    const find = (cols: string[], keys: string[]) => cols.find((n) => keys.some((k) => n.toLowerCase().includes(k))) ?? null;
    const revCol = find(numericCols, ["revenue", "sales", "amount", "total", "income"]) ?? numericCols[0];
    const profCol = find(numericCols, ["profit", "margin", "net"]);
    const regionCol = find(stringCols, ["region", "country", "state", "city"]);
    const productCol = find(stringCols, ["product", "item", "sku", "name", "category"]);
    const sum = (col: string | null | undefined) => col ? payload.data!.rows.reduce((s, r) => s + (Number(r[col]) || 0), 0) : 0;
    const bestBy = (cat: string | null) => {
      if (!cat || !revCol) return "—";
      const m = new Map<string, number>();
      for (const r of payload.data!.rows) {
        const k = String(r[cat] ?? "Unknown");
        m.set(k, (m.get(k) || 0) + (Number(r[revCol]) || 0));
      }
      return Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    };
    const growthPct = (() => {
      if (!revCol || payload.data!.rows.length < 4) return null;
      const n = payload.data!.rows.length;
      const half = Math.floor(n / 2);
      const a = payload.data!.rows.slice(0, half).reduce((s, r) => s + (Number(r[revCol]) || 0), 0);
      const b = payload.data!.rows.slice(half).reduce((s, r) => s + (Number(r[revCol]) || 0), 0);
      return a === 0 ? null : ((b - a) / a) * 100;
    })();

    const cards = [
      { label: `Total ${revCol ?? "Value"}`, value: fmtNum(sum(revCol)), color: ACCENT },
      { label: `Total ${profCol ?? "Profit"}`, value: fmtNum(sum(profCol)), color: "10B981" },
      { label: "Growth", value: growthPct == null ? "—" : `${growthPct.toFixed(1)}%`, color: "F59E0B" },
      { label: "Best Region", value: bestBy(regionCol), color: "0EA5E9" },
      { label: "Best Product", value: bestBy(productCol), color: "8B5CF6" },
      { label: "Total Records", value: fmtNum(payload.data.rows.length), color: "64748B" },
    ];

    const cardW = 4.0, cardH = 2.4, gap = 0.25;
    cards.forEach((c, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 0.5 + col * (cardW + gap);
      const y = 1.5 + row * (cardH + gap);
      s3.addShape("rect", { x, y, w: cardW, h: cardH, fill: { color: "FFFFFF" }, line: { color: "E2E8F0", width: 0.5 } });
      s3.addShape("rect", { x, y, w: 0.1, h: cardH, fill: { color: c.color } });
      s3.addText(c.label.toUpperCase(), { x: x + 0.3, y: y + 0.25, w: cardW - 0.5, h: 0.4, fontSize: 11, color: MUTED, bold: true, fontFace: "Calibri" });
      s3.addText(c.value, { x: x + 0.3, y: y + 0.8, w: cardW - 0.5, h: 1.4, fontSize: 32, bold: true, color: INK, fontFace: "Calibri", valign: "middle" });
    });
  }
  addFooter(s3, 3, 8);

  // ---- Slide 4: Charts ----
  const s4 = pres.addSlide();
  s4.background = { color: "FFFFFF" };
  addAccentBar(s4);
  s4.addText("Charts & Trends", { x: 0.5, y: 0.4, w: 12, h: 0.7, fontSize: 32, bold: true, color: NAVY, fontFace: "Calibri" });

  const chartEls = Array.from(document.querySelectorAll("#chart-grid > div, #auto-dashboard-root")).slice(0, 4);
  if (chartEls.length === 0) {
    s4.addText("No charts have been generated yet. Visit the Dashboard tab to build visualizations.", {
      x: 0.5, y: 3, w: 12.3, h: 1, fontSize: 16, color: MUTED, align: "center", fontFace: "Calibri",
    });
  } else {
    const positions = chartEls.length === 1
      ? [{ x: 1.5, y: 1.4, w: 10.3, h: 5.4 }]
      : chartEls.length === 2
      ? [{ x: 0.5, y: 1.4, w: 6.1, h: 5.4 }, { x: 6.7, y: 1.4, w: 6.1, h: 5.4 }]
      : [
          { x: 0.5, y: 1.4, w: 6.1, h: 2.6 }, { x: 6.7, y: 1.4, w: 6.1, h: 2.6 },
          { x: 0.5, y: 4.1, w: 6.1, h: 2.6 }, { x: 6.7, y: 4.1, w: 6.1, h: 2.6 },
        ];
    for (let i = 0; i < Math.min(chartEls.length, positions.length); i++) {
      try {
        const canvas = await html2canvas(chartEls[i] as HTMLElement, { backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false });
        s4.addImage({ data: canvas.toDataURL("image/png"), ...positions[i] });
      } catch {
        // skip
      }
    }
  }
  addFooter(s4, 4, 8);

  // ---- Slide 5: Insights ----
  const s5 = pres.addSlide();
  s5.background = { color: SOFT };
  addAccentBar(s5);
  s5.addText("AI Insights", { x: 0.5, y: 0.4, w: 12, h: 0.7, fontSize: 32, bold: true, color: NAVY, fontFace: "Calibri" });
  const insights = (payload.insights ?? []).slice(0, 7);
  if (insights.length === 0) {
    s5.addText("No insights generated yet.", { x: 0.5, y: 3, w: 12.3, h: 1, fontSize: 16, color: MUTED, align: "center", fontFace: "Calibri" });
  } else {
    s5.addText(insights.map((t) => ({ text: t, options: { bullet: { code: "25CF" }, color: INK } })), {
      x: 0.6, y: 1.3, w: 12.1, h: 5.6, fontSize: 16, fontFace: "Calibri", paraSpaceAfter: 8, valign: "top",
    });
  }
  addFooter(s5, 5, 8);

  // ---- Slide 6: Predictions ----
  const s6 = pres.addSlide();
  s6.background = { color: "FFFFFF" };
  addAccentBar(s6);
  s6.addText("Prediction Insights", { x: 0.5, y: 0.4, w: 12, h: 0.7, fontSize: 32, bold: true, color: NAVY, fontFace: "Calibri" });
  const preds = (payload.predictions ?? []).slice(0, 7);
  if (preds.length === 0) {
    s6.addText("No prediction insights available.", { x: 0.5, y: 3, w: 12.3, h: 1, fontSize: 16, color: MUTED, align: "center", fontFace: "Calibri" });
  } else {
    s6.addText(preds.map((t) => ({ text: t, options: { bullet: { code: "25B6" }, color: INK } })), {
      x: 0.6, y: 1.3, w: 12.1, h: 5.6, fontSize: 16, fontFace: "Calibri", paraSpaceAfter: 8, valign: "top",
    });
  }
  addFooter(s6, 6, 8);

  // ---- Slide 7: Recommendations ----
  const s7 = pres.addSlide();
  s7.background = { color: SOFT };
  addAccentBar(s7);
  s7.addText("Recommendations", { x: 0.5, y: 0.4, w: 12, h: 0.7, fontSize: 32, bold: true, color: NAVY, fontFace: "Calibri" });
  const recs = (payload.recommendations ?? []).slice(0, 7);
  if (recs.length === 0) {
    s7.addText("Generate the executive summary to populate recommendations.", { x: 0.5, y: 3, w: 12.3, h: 1, fontSize: 16, color: MUTED, align: "center", fontFace: "Calibri" });
  } else {
    s7.addText(recs.map((t) => ({ text: t, options: { bullet: { code: "2713" }, color: INK } })), {
      x: 0.6, y: 1.3, w: 12.1, h: 5.6, fontSize: 16, fontFace: "Calibri", paraSpaceAfter: 10, valign: "top",
    });
  }
  addFooter(s7, 7, 8);

  // ---- Slide 8: Conclusion ----
  const s8 = pres.addSlide();
  s8.background = { color: NAVY_DEEP };
  s8.addText("Thank You", { x: 0.5, y: 2.6, w: 12.3, h: 1.2, fontSize: 56, bold: true, color: "FFFFFF", align: "center", fontFace: "Calibri" });
  s8.addText("Questions, ideas, next steps?", { x: 0.5, y: 4.0, w: 12.3, h: 0.6, fontSize: 22, color: "CADCFC", align: "center", fontFace: "Calibri" });
  s8.addText("Cognilytix AI · AI-powered business analytics", { x: 0.5, y: 6.6, w: 12.3, h: 0.5, fontSize: 12, color: "94A3B8", align: "center", fontFace: "Calibri" });

  const blob = (await pres.write({ outputType: "blob" })) as Blob;
  return blob;
}

export async function downloadExecutivePPTX(payload: ReportPayload) {
  const blob = await generateExecutivePPTX(payload);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${payload.title.replace(/[^a-z0-9]+/gi, "_")}.pptx`;
  a.click();
  URL.revokeObjectURL(url);
}