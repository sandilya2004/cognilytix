import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

export default function PageAddress() {
  const { pathname } = useLocation();
  const url = `https://cognilytix.app${pathname}`;

  return (
    <Helmet>
      <link rel="canonical" href={url} />
      <meta property="og:url" content={url} />
    </Helmet>
  );
}