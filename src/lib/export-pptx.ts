import PptxGenJS from "pptxgenjs";
import type { ChartConfig } from "./chart-types";

export async function exportToPPTX(charts: ChartConfig[], summaryText?: string) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "DataLens";
  pptx.title = "DataLens Report";

  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: "1e1b4b" };
  titleSlide.addText("DataLens Report", {
    x: 0.5, y: 1.5, w: 12, h: 1.5,
    fontSize: 44, fontFace: "Arial", color: "FFFFFF", bold: true, align: "center",
  });
  titleSlide.addText(`${charts.length} Visualizations • Generated ${new Date().toLocaleDateString()}`, {
    x: 0.5, y: 3.2, w: 12, h: 0.6,
    fontSize: 18, fontFace: "Arial", color: "a5b4fc", align: "center",
  });

  // Capture each chart as image and add to slides
  const chartEls = document.querySelectorAll("#chart-grid > div");

  for (let i = 0; i < charts.length; i++) {
    const chart = charts[i];
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };

    slide.addText(chart.title, {
      x: 0.5, y: 0.3, w: 12, h: 0.6,
      fontSize: 24, fontFace: "Arial", color: "1e1b4b", bold: true,
    });

    slide.addText(`Chart Type: ${chart.type.toUpperCase()}`, {
      x: 0.5, y: 0.9, w: 12, h: 0.4,
      fontSize: 12, fontFace: "Arial", color: "6b7280",
    });

    // Try to capture the chart as image
    const el = chartEls[i] as HTMLElement | undefined;
    if (el) {
      try {
        const { default: html2canvas } = await import("html2canvas");
        const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL("image/png");
        slide.addImage({ data: imgData, x: 0.5, y: 1.5, w: 12, h: 5.5 });
      } catch {
        slide.addText("(Chart image could not be captured)", {
          x: 0.5, y: 3, w: 12, h: 1, fontSize: 14, color: "9ca3af", align: "center",
        });
      }
    }

    // Add SQL/Python code if available
    if (chart.sqlCode) {
      slide.addText(`SQL: ${chart.sqlCode}`, {
        x: 0.5, y: 7.1, w: 6, h: 0.4, fontSize: 8, fontFace: "Courier New", color: "6b7280",
      });
    }
  }

  // Summary slide
  if (summaryText) {
    const summarySlide = pptx.addSlide();
    summarySlide.background = { color: "f8fafc" };
    summarySlide.addText("Summary & Recommendations", {
      x: 0.5, y: 0.3, w: 12, h: 0.6,
      fontSize: 28, fontFace: "Arial", color: "1e1b4b", bold: true,
    });
    // Split summary into chunks that fit
    const cleanText = summaryText.replace(/[#*]/g, "").replace(/\n{3,}/g, "\n\n");
    summarySlide.addText(cleanText.slice(0, 2000), {
      x: 0.5, y: 1.2, w: 12, h: 6,
      fontSize: 11, fontFace: "Arial", color: "374151", valign: "top", paraSpaceAfter: 6,
    });
  }

  await pptx.writeFile({ fileName: "DataLens_Report.pptx" });
}
