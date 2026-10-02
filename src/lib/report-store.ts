// Shared, module-level store so tab panels can publish their generated results
// and exports (PDF/PPT) can include them even when the tab is not visible.
export interface ReportStore {
  story?: string;
  predictions?: string[];
  predictionAI?: string;
  predictionInsights?: { growth: string[]; risks: string[]; actions: string[]; trends: string[] };
}

export const reportStore: ReportStore = {};

export function setReportStore(patch: Partial<ReportStore>) {
  Object.assign(reportStore, patch);
}

export function clearReportStore() {
  for (const k of Object.keys(reportStore)) delete (reportStore as Record<string, unknown>)[k];
}

/** Temporarily render hidden tab panels off-screen so charts can be captured. */
export async function withPanelsVisible<T>(fn: () => Promise<T>): Promise<T> {
  const panels = Array.from(document.querySelectorAll<HTMLElement>("[data-tab-panel].hidden"));
  const saved = panels.map((p) => p.getAttribute("style") ?? "");
  panels.forEach((p) => {
    p.classList.remove("hidden");
    p.style.position = "fixed";
    p.style.left = "-20000px";
    p.style.top = "0";
    p.style.width = "1200px";
  });
  window.dispatchEvent(new Event("resize"));
  await new Promise((r) => setTimeout(r, 900));
  try {
    return await fn();
  } finally {
    panels.forEach((p, i) => {
      p.classList.add("hidden");
      p.setAttribute("style", saved[i]);
    });
  }
}
