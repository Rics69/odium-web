import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A self-contained server for the Docker image (Dockerfile).
  output: "standalone",
  typedRoutes: true,
  poweredByHeader: false,
  images: {
    // Trailer previews from YouTube (lib/trailer.ts).
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }],
  },
  // Everything but the CSP, which needs a nonce per request (proxy.ts).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
