import type { Metadata } from "next";

// What every link preview of the site says about it. A page that sets its
// own openGraph replaces the whole object, so it spreads this in.
export const siteOpenGraph = {
  siteName: "Odium",
  locale: "ru_RU",
  type: "website",
} satisfies Metadata["openGraph"];
