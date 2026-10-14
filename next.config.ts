import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { headerRules } from "./lib/security-headers";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Static headers (no nonce), so every page stays prerendered. See lib/security-headers.ts.
  async headers() {
    return headerRules({ dev: process.env.NODE_ENV !== "production" });
  },
  partialPrefetching: true,
  experimental: {
    // Off on purpose. The Tailwind loader scans the file system itself, so Turbopack's persisted cache
    // (.next/cache/turbopack, restored by Vercel from an earlier deployment) can serve a stale stylesheet:
    // production builds failed on a class that no longer existed in any scanned file.
    turbopackFileSystemCacheForBuild: false,
    // app/global-not-found.tsx: bilingual 404 for URLs that match no route (the proxy skips paths with a dot).
    globalNotFound: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
export default withNextIntl(nextConfig);
