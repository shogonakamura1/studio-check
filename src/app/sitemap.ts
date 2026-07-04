import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { STUDIO_PAGE_IDS } from "@/lib/studio-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/studios`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/guide`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...STUDIO_PAGE_IDS.map((id) => ({
      url: `${SITE_URL}/studios/${id}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
