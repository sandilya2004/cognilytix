import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { getPageSearchPolicy } from "@/lib/seo-policy";

export default function PageAddress() {
  const { pathname } = useLocation();
  const { canonical, robots } = getPageSearchPolicy(pathname);

  return (
    <Helmet>
      {canonical && <link rel="canonical" href={canonical} />}
      {canonical && <meta property="og:url" content={canonical} />}
      <meta name="robots" content={robots} />
    </Helmet>
  );
}