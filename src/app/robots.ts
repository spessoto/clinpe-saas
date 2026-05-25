import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getAppUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/patients",
          "/agenda",
          "/notifications",
          "/finance",
          "/sterilization",
          "/commissions",
          "/settings",
          "/pop-documents",
          "/billing",
          "/admin",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
