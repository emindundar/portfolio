import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Off on purpose. The Tailwind loader scans the file system itself, so Turbopack's persisted cache
    // (.next/cache/turbopack, restored by Vercel from an earlier deployment) can serve a stale stylesheet:
    // production builds failed on a class that no longer existed in any scanned file.
    turbopackFileSystemCacheForBuild: false,
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
