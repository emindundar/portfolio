import { timeline, services, events } from "#site/content";
import type { Locale } from "@/i18n/routing";

type Text = { title: string; body?: string; caption?: string };
type Localized = { en: Text; tr: Text };

export function localize<T extends Localized>(items: readonly T[], locale: Locale) {
  return items.map((i) => ({ ...i, text: i[locale] }));
}

export const getTimeline = (locale: Locale) => localize(timeline, locale);
export const getServices = (locale: Locale) => localize(services, locale);
export const getEvents = (locale: Locale) => localize(events, locale);
