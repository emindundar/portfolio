import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getProjects } from "@/lib/content";
import { PAGE_PATHS, absoluteUrl } from "@/lib/seo";

// Build time, at module scope (cacheComponents forbids reading the clock during render).
const BUILT_AT = new Date();

export function buildSitemap(slugs: string[], lastModified: Date): MetadataRoute.Sitemap {
  const paths = [...PAGE_PATHS, ...slugs.map((s) => `/work/${s}`)];
  return paths.flatMap((path) => {
    const languages: Record<string, string> = Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(`/${l}${path}`)]));
    languages["x-default"] = absoluteUrl(`/${routing.defaultLocale}${path}`);
    return routing.locales.map((locale) => ({ url: absoluteUrl(`/${locale}${path}`), lastModified, alternates: { languages } }));
  });
}

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap(getProjects(routing.defaultLocale).map((p) => p.slug), BUILT_AT);
}
