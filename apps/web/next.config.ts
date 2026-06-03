import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getSecurityHeaders } from "./src/security/headers";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
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
