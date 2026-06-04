import type { MetadataRoute } from "next";

import { siteOrigin } from "./seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      changeFrequency: "weekly",
      lastModified: new Date("2026-06-04T00:00:00.000Z"),
      priority: 1,
      url: siteOrigin
    }
  ];
}
