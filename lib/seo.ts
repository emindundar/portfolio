import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";

/** Origin only. Order: explicit setting, Vercel's production host, local development. */
export function resolveSiteUrl(env: Record<string, string | undefined>): string {
  const candidates = [env.NEXT_PUBLIC_SITE_URL, env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`];
  for (const value of candidates) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if ((url.protocol === "https:" || url.protocol === "http:") && url.hostname) return url.origin;
    } catch {
      // not a URL: try the next candidate
    }
  }
  return "http://localhost:3000";
}

// Literal property access so the bundler inlines NEXT_PUBLIC_SITE_URL. Server-only: never import from a client component.
export const SITE_URL = resolveSiteUrl({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
});

export const SITE_NAME = "Emin Dündar";
export const PAGE_PATHS = ["", "/work", "/about", "/services", "/colophon", "/contact"] as const;
const OG_LOCALE: Record<Locale, string> = { en: "en_US", tr: "tr_TR" };

function join(locale: Locale, path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const clean = trimmed === "" ? "" : trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `/${locale}${clean}`;
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function alternatesFor(path: string, locale: Locale): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = join(l, path);
  languages["x-default"] = join(routing.defaultLocale, path);
  return { canonical: join(locale, path), languages };
}

export function openGraphFor(input: { path: string; locale: Locale; title: string; description: string; type?: "website" | "article" }): Pick<Metadata, "openGraph" | "twitter"> {
  const { path, locale, title, description, type = "website" } = input;
  // The home page and case pages have their own opengraph-image file (picked up by Next). Every other page defines its
  // own openGraph object, which replaces the parent's, so the locale image must be named here.
  const hasOwnImage = path === "/" || path === "" || /^\/work\/[^/]+$/.test(path);
  const image = `/${locale}/opengraph-image`;
  return {
    openGraph: {
      type, url: join(locale, path), title, description, siteName: SITE_NAME,
      locale: OG_LOCALE[locale], alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      ...(hasOwnImage ? {} : { images: [{ url: image, width: 1200, height: 630, type: "image/png", alt: SITE_NAME }] }),
    },
    twitter: { card: "summary_large_image", title, description, ...(hasOwnImage ? {} : { images: [{ url: image, alt: SITE_NAME }] }) },
  };
}
