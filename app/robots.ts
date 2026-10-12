import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// For search engines (spec, section 10): everything but the admin, the
// profile and the API, and where the sitemap is.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/profile", "/api/"],
    },
    sitemap: new URL("/sitemap.xml", env.SITE_URL).toString(),
  };
}
