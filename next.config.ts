import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

// This computer's addresses in the local network. A phone on the same Wi-Fi
// opens the dev server by one of them, and Next.js blocks its dev assets
// (the reload socket the page waits for) from any host but localhost.
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .flatMap((address) =>
    address && address.family === "IPv4" && !address.internal
      ? [address.address]
      : [],
  );

const nextConfig: NextConfig = {
  // A self-contained server for the Docker image (Dockerfile).
  output: "standalone",
  typedRoutes: true,
  poweredByHeader: false,
  allowedDevOrigins: lanAddresses,
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
