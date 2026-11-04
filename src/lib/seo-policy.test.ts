import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getPageSearchPolicy } from "./seo-policy";

const expectedPublicUrls = [
  "https://cognilytix.app/",
  "https://cognilytix.app/pricing",
  "https://cognilytix.app/demo",
  "https://cognilytix.app/privacy",
  "https://cognilytix.app/terms",
  "https://cognilytix.app/refunds",
];

describe("public search policy", () => {
  it.each(expectedPublicUrls)("uses the HTTPS non-www canonical %s", url => {
    expect(getPageSearchPolicy(new URL(url).pathname).canonical).toBe(url);
  });

  it.each(["/", "/pricing", "/demo", "/privacy", "/terms", "/refunds"])(
    "allows indexing of the public page %s", path => {
      expect(getPageSearchPolicy(path).robots).toBe("index, follow");
    },
  );

  it.each(["/dashboard", "/projects", "/reports", "/account/subscription", "/admin", "/admin-dashboard", "/auth", "/.lovable/oauth/consent", "/report/private-id", "/unknown-page"])(
    "excludes private, authentication, shared and missing page %s", path => {
      expect(getPageSearchPolicy(path)).toEqual({ canonical: null, robots: "noindex, nofollow" });
    },
  );

  it("normalizes public trailing-slash and case aliases without altering routes", () => {
    expect(getPageSearchPolicy("/Pricing/").canonical).toBe("https://cognilytix.app/pricing");
  });

  it("keeps the sitemap limited to the six canonical public URLs", () => {
    const sitemap = readFileSync("public/sitemap.xml", "utf8");
    const urls = Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g), match => match[1]);
    expect(urls).toEqual(expectedPublicUrls);
  });

  it("allows Googlebot to fetch public pages and advertises the canonical sitemap", () => {
    const robots = readFileSync("public/robots.txt", "utf8");
    expect(robots).toMatch(/User-agent: Googlebot\s+Allow: \//);
    expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m);
    expect(robots).toContain("Sitemap: https://cognilytix.app/sitemap.xml");
  });
});