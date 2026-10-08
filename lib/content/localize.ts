import type { Locale } from "@/i18n/routing";

export type Text = { title: string; body?: string; caption?: string };
export type Localized = { en: Text; tr: Text };
export type LocalizedString = string | { en: string; tr: string };

export function localize<T extends Localized>(items: readonly T[], locale: Locale) {
  return items.map((i) => ({ ...i, text: i[locale] }));
}

/** Timeline `org` is either a plain string (same in both locales) or an `{ en, tr }` pair. */
export function orgName(entry: { org: LocalizedString }, locale: Locale): string {
  return typeof entry.org === "string" ? entry.org : entry.org[locale];
}
