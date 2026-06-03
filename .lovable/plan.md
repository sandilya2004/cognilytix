This is a large multi-feature upgrade. I'll deliver it in two phases so you can review progress between them.

## Phase 1 — Landing page + auth flow (ship first)

**Goal:** Visiting the site shows a public landing page; login only happens when the user asks for it.

1. Make `/` a **public** route rendering a new marketing Landing page (Hero, Features, Why Cognilytix, Use Cases, Testimonials placeholder, Footer, top nav with Home / Features / Pricing / About / Contact / Login / Sign Up).
2. Keep these **protected**: `/dashboard`, `/projects`, `/admin`, `/admin-dashboard`, `/reports` (new).
3. Logged-in users still see the landing page at `/` — they only go to the dashboard when they click "Dashboard" / "Get Started".
4. Nav reflects auth state (Login/Sign Up when logged out, Dashboard/Sign Out when logged in).

## Phase 2 — Reports, exports, sharing, executive summary

1. **Export PDF** — Cover page, KPI summary, charts, AI insights, prediction insights, recommendations. Uses `jspdf` + `html2canvas` (already in project).
2. **Export PowerPoint** — 8-slide deck (Title, Exec Summary, KPIs, Charts, Insights, Predictions, Recommendations, Conclusion) using `pptxgenjs`.
3. **AI Executive Summary** — New edge function `executive-summary` calling Lovable AI (Gemini) that produces Overview / Key Findings / Growth Opportunities / Risk Areas / Recommendations in business language.
4. **One-click Executive Report** — `[Generate Executive Report]` button orchestrates summary + PDF + PPT in one flow.
5. **Secure Link Sharing**
   - New table `shared_reports` (id, owner_id, title, snapshot jsonb, permission, password_hash nullable, expires_at nullable, created_at).
   - `[Share Report]` dialog: permission (View / Comment / Edit), expiry, optional password.
   - Public route `/report/:id` renders the snapshot; if password set, prompts for it; respects expiry.
6. **Interactive shared dashboard** — Shared report page reuses `AutoDashboard` so recipients can filter/slice. Comment/Edit permissions stub UI now, wired to RLS for future.
7. **Report History page** `/reports` — lists user's generated/shared reports, with View / Download / Delete.
8. **Download chart as PNG / dashboard as image** — small button on each `ChartCard` + dashboard root.

## Technical details

- New deps: `pptxgenjs` (jspdf + html2canvas already in `AutoDashboard`).
- New tables: `shared_reports` (RLS: owner full access; anon SELECT only by id via security-definer RPC that also checks password/expiry).
- New edge functions: `executive-summary`, `share-report-access` (validates password, returns snapshot).
- New components: `pages/LandingPage` (replaces current authenticated landing), `pages/Reports.tsx`, `pages/SharedReport.tsx`, `components/dashboard/ExportMenu.tsx`, `components/dashboard/ShareDialog.tsx`, `components/dashboard/ExecutiveSummary.tsx`, `lib/export-pdf.ts`, `lib/export-pptx.ts`.
- Scheduled reports / Email / Slack / Teams: scaffolded as a `reports_schedule` placeholder table + stub UI marked "Coming soon" so future work plugs in cleanly. No external integrations wired now.

## Out of scope (flag for later)

- Real-time collaboration / comments backend
- Actually sending scheduled emails / Slack / Teams messages
- Pricing/About/Contact page content (will create empty stub pages with nav links so routes don't 404)

Approve and I'll start with Phase 1, then continue into Phase 2 in the same session.