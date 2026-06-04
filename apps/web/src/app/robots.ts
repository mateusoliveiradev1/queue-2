import type { MetadataRoute } from "next";

import { siteOrigin } from "./seo";

export default function robots(): MetadataRoute.Robots {
  return {
    host: siteOrigin,
    rules: {
      allow: "/",
      disallow: ["/api/", "/app/"],
      userAgent: "*"
    },
    sitemap: `${siteOrigin}/sitemap.xml`
  };
}
