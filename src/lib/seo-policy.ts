export const CANONICAL_ORIGIN = "https://cognilytix.app";

export const PUBLIC_INDEXABLE_PATHS = [
  "/", "/pricing", "/demo", "/privacy", "/terms", "/refunds",
] as const;

export function getPageSearchPolicy(pathname: string) {
  const normalizedPath = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  const publicPath = PUBLIC_INDEXABLE_PATHS.find(path => path === normalizedPath);

  if (!publicPath) {
    return { canonical: null, robots: "noindex, nofollow" } as const;
  }

  return {
    canonical: `${CANONICAL_ORIGIN}${publicPath}`,
    robots: "index, follow",
  } as const;
}