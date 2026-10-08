import pptxgen from "pptxgenjs";
import html2canvas from "html2canvas";
import type { ReportPayload } from "./export-pdf";
import { CHART_SELECTOR, cleanText, computeKPIs } from "./export-pdf";

const NAVY = "1E2761";
const NAVY_DEEP = "0F1B3D";
const ACCENT = "4F46E5";
const INK = "21293C";
const MUTED = "6E778A";
const SOFT = "F8FAFC";
const WHITE = "FFFFFF";

function addAccentBar(slide: pptxgen.Slide) {
  slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.15, fill: { color: ACCENT } });
}

function addFooter(slide: pptxgen.Slide, page: number, total: number) {
  slide.addText(`Cognilytix · ${new Date().toLocaleDateString()}`, {
    x: 0.4, y: 7.1, w: 5, h: 0.25, fontSize: 9, color: MUTED, fontFace: "Calibri",
  });
  slide.addText(`${page} / ${total}`, {
    x: 12.1, y: 7.1, w: 0.8, h: 0.25, fontSize: 9, color: MUTED, align: "right", fontFace: "Calibri",
  });
}

function addPageTitle(slide: pptxgen.Slide, title: string) {
  addAccentBar(slide);
  slide.addText(title, {
    x: 0.5, y: 0.35, w: 12.3, h: 0.65, fontSize: 29, bold: true, color: NAVY, fontFace: "Calibri",
    breakLine: false, fit: "shrink",
  });
}

function splitParagraph(text: string, maxChars = 680): string[] {
  const paragraphs = cleanText(text).split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      if (current && `${current} ${word}`.length > maxChars) {
        chunks.push(current);
        current = word;
      } else current = current ? `${current} ${word}` : word;
    }
    if (current) chunks.push(current);
  }
  return chunks.length ? chunks : ["No content available."];
}

function addTextSection(
  pres: pptxgen,
  slides: pptxgen.Slide[],
  title: string,
  text: string | undefined,
  pageRef: { value: number },
  totalRef: { value: number },
) {
  const chunks = splitParagraph(text || "No content available.");
  chunks.forEach((chunk, index) => {
    const slide = addSlide(pres, slides);
    slide.background = { color: index % 2 ? WHITE : SOFT };
    addPageTitle(slide, chunks.length > 1 ? `${title} (${index + 1}/${chunks.length})` : title);
    slide.addText(chunk, {
      x: 0.65, y: 1.35, w: 12.0, h: 5.35, fontSize: 18, color: INK,
      fontFace: "Calibri", valign: "top", breakLine: false, fit: "shrink",
      paraSpaceAfter: 10, margin: 0.08,
    });
    pageRef.value += 1;
    totalRef.value += 1;
  });
}

function addListSection(
  pres: pptxgen,
  slides: pptxgen.Slide[],
  title: string,
  items: string[] | undefined,
  pageRef: { value: number },
  totalRef: { value: number },
) {
  const list = (items ?? []).map(cleanText).filter(Boolean);
  const rows = list.length ? list : ["No items available."];
  const groups: string[][] = [];
  let group: string[] = [];
  let weight = 0;
  for (const item of rows) {
    const itemWeight = Math.max(1, Math.ceil(item.length / 110));
    if (group.length && (group.length >= 5 || weight + itemWeight > 9)) {
      groups.push(group);
      group = [];
      weight = 0;
    }
    group.push(item);
    weight += itemWeight;
  }
  if (group.length) groups.push(group);

  groups.forEach((itemsInGroup, index) => {
    const slide = addSlide(pres, slides);
    slide.background = { color: index % 2 ? WHITE : SOFT };
    addPageTitle(slide, groups.length > 1 ? `${title} (${index + 1}/${groups.length})` : title);
    let y = 1.28;
    for (const item of itemsInGroup) {
      const lines = Math.max(1, Math.ceil(item.length / 112));
      const height = Math.min(1.1, 0.42 + lines * 0.26);
      slide.addText(item, {
        x: 0.85, y, w: 11.8, h: height, fontSize: 17, color: INK, fontFace: "Calibri",
        bullet: { indent: 17 }, valign: "top", fit: "shrink", margin: 0.03,
      });
      y += height + 0.17;
    }
    pageRef.value += 1;
    totalRef.value += 1;
  });
}

async function captureChartImages(): Promise<string[]> {
  const elements = Array.from(document.querySelectorAll(CHART_SELECTOR));
  const images: string[] = [];
  for (const element of elements.slice(0, 12)) {
    const el = element as HTMLElement;
    if (el.getBoundingClientRect().width < 20 || el.getBoundingClientRect().height < 20) continue;
    try {
      const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false });
      images.push(canvas.toDataURL("image/png"));
    } catch {
      // Preserve other charts if an individual visualization cannot be captured.
    }
  }
  return images;
}

function addSlide(pres: pptxgen, slides: pptxgen.Slide[]): pptxgen.Slide {
  const slide = pres.addSlide();
  slides.push(slide);
  return slide;
}

export async function generateExecutivePPTX(payload: ReportPayload): Promise<Blob> {
  const pres = new pptxgen();
  const slides: pptxgen.Slide[] = [];
  pres.layout = "LAYOUT_WIDE";
  pres.title = payload.title;
  pres.author = "Cognilytix AI";

  const cover = addSlide(pres, slides);
  cover.background = { color: NAVY_DEEP };
  cover.addShape("rect", { x: 0, y: 3.55, w: 13.33, h: 0.08, fill: { color: ACCENT } });
  cover.addText(cleanText(payload.title), {
    x: 0.8, y: 2.1, w: 11.7, h: 1.15, fontSize: 42, bold: true, color: WHITE,
    fontFace: "Calibri", align: "center", valign: "middle", fit: "shrink",
  });
  cover.addText("Executive Business Report", { x: 0.8, y: 3.85, w: 11.7, h: 0.55, fontSize: 22, color: "CADCFC", fontFace: "Calibri", align: "center" });
  cover.addText(`Dataset: ${cleanText(payload.fileName || "—")}`, { x: 0.8, y: 5.5, w: 11.7, h: 0.4, fontSize: 15, color: "CADCFC", fontFace: "Calibri", align: "center", fit: "shrink" });
  cover.addText(`Generated: ${new Date().toLocaleDateString(undefined, { dateStyle: "long" })}`, { x: 0.8, y: 6.0, w: 11.7, h: 0.35, fontSize: 13, color: "94A3B8", fontFace: "Calibri", align: "center" });

  let page = 2;
  let total = 2;
  const pageRef = { get value() { return page; }, set value(v: number) { page = v; } };
  const totalRef = { get value() { return total; }, set value(v: number) { total = v; } };

  addTextSection(pres, slides, "Executive Summary", payload.executiveSummary, pageRef, totalRef);

  const kpiSlide = addSlide(pres, slides);
  kpiSlide.background = { color: SOFT };
  addPageTitle(kpiSlide, "Key Performance Indicators");
  if (payload.data) {
    const k = computeKPIs(payload.data);
    const cards = [
      ...k.cards,
    ];
    cards.forEach((card, i) => {
      const x = 0.55 + (i % 3) * 4.1;
      const y = 1.45 + Math.floor(i / 3) * 2.45;
      kpiSlide.addShape("rect", { x, y, w: 3.85, h: 2.1, fill: { color: WHITE }, line: { color: "E2E8F0", width: 0.6 } });
      kpiSlide.addShape("rect", { x, y, w: 0.09, h: 2.1, fill: { color: ACCENT } });
      kpiSlide.addText(card.label.toUpperCase(), { x: x + 0.25, y: y + 0.25, w: 3.35, h: 0.35, fontSize: 11, color: MUTED, bold: true, fontFace: "Calibri", fit: "shrink" });
      kpiSlide.addText(cleanText(card.value), { x: x + 0.25, y: y + 0.8, w: 3.35, h: 0.95, fontSize: 25, bold: true, color: INK, fontFace: "Calibri", valign: "middle", fit: "shrink" });
    });
  } else {
    kpiSlide.addText("No dataset was available for KPI calculations.", { x: 0.8, y: 3, w: 11.7, h: 0.5, fontSize: 16, color: MUTED, align: "center", fontFace: "Calibri" });
  }
  page += 1;
  total += 1;

  const chartImages = await captureChartImages();
  if (!chartImages.length) {
    addTextSection(pres, slides, "Charts & Visualizations", "No charts were available to include in this report.", pageRef, totalRef);
  } else {
    for (let i = 0; i < chartImages.length; i += 2) {
      const slide = addSlide(pres, slides);
      slide.background = { color: WHITE };
      addPageTitle(slide, chartImages.length > 2 ? `Charts & Visualizations (${Math.floor(i / 2) + 1})` : "Charts & Visualizations");
      const batch = chartImages.slice(i, i + 2);
      batch.forEach((data, j) => {
        const pos = batch.length === 1
          ? { x: 0.85, y: 1.35, w: 11.65, h: 5.4 }
          : { x: 0.55 + j * 6.25, y: 1.55, w: 6.05, h: 4.95 };
        slide.addImage({ data, x: pos.x, y: pos.y, sizing: { type: "contain", w: pos.w, h: pos.h } });
      });
      page += 1;
      total += 1;
    }
  }

  addListSection(pres, slides, "AI Insights", payload.insights, pageRef, totalRef);
  addListSection(pres, slides, "Growth Opportunities", payload.opportunities, pageRef, totalRef);
  addListSection(pres, slides, "Problems & Risk Areas", payload.problems, pageRef, totalRef);
  addListSection(pres, slides, "Predictions", payload.predictions, pageRef, totalRef);
  if (payload.predictionAI) addTextSection(pres, slides, "AI Forecast Commentary", payload.predictionAI, pageRef, totalRef);
  addListSection(pres, slides, "Prediction Insights", payload.predictionInsights, pageRef, totalRef);
  addListSection(pres, slides, "Recommendations", payload.recommendations, pageRef, totalRef);
  addTextSection(pres, slides, "Data Story", payload.story, pageRef, totalRef);

  // Add consistent numbering after all pages are known.
  slides.forEach((slide, index) => {
    if (index > 0) addFooter(slide, index + 1, slides.length);
  });

  return (await pres.write({ outputType: "blob" })) as Blob;
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