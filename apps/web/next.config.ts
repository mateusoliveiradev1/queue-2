import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getSecurityHeaders } from "./src/security/headers";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    maximumRedirects: 0,
    minimumCacheTTL: 60 * 60 * 24 * 7,
    qualities: [75],
    remotePatterns: [
      {
        hostname: "media.rawg.io",
        pathname: "/media/**",
        protocol: "https",
        search: ""
      }
    ]
  },
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@queue/db", "@queue/ui"],
  turbopack: {
    root: workspaceRoot
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: getSecurityHeaders()
      }
    ];
  }
};

export default nextConfig;
