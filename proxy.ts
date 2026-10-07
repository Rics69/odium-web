import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy } from "@/lib/csp";

// Every page request gets a fresh nonce in its Content-Security-Policy.
// Next.js reads the policy from the request header and puts the nonce on its
// own scripts, so nothing else can run.
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const siteUrl = process.env.SITE_URL ?? "";
  const https = siteUrl.startsWith("https://");
  const policy = contentSecurityPolicy({
    nonce,
    dev: process.env.NODE_ENV === "development",
    https,
  });

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  // Browsers remember HSTS for a year: only for the real domain, never for
  // https://localhost in local Docker runs.
  if (https && !new URL(siteUrl).hostname.endsWith("localhost")) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not the API, Next.js assets, or files from public/.
      source: "/((?!api|_next/static|_next/image|favicon.ico|placeholders).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
