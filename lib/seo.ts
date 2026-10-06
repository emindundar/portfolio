import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";

export const SITE_URL = "https://emindundar.dev";

function join(locale: Locale, path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const clean = trimmed === "" ? "" : trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `/${locale}${clean}`;
}

export function alternatesFor(path: string, locale: Locale): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = join(l, path);
  languages["x-default"] = join(routing.defaultLocale, path);
  return { canonical: join(locale, path), languages };
}
