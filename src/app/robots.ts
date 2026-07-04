import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // API と Instabase 予約中継ページはクロール対象外
        disallow: ["/api/", "/instabase/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
