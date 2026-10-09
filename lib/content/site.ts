import { timeline, services, events, now } from "#site/content";
import type { Locale } from "@/i18n/routing";
import { localize } from "./localize";

export const getTimeline = (locale: Locale) => localize(timeline, locale);
export const getServices = (locale: Locale) => localize(services, locale);
export const getEvents = (locale: Locale) => localize(events, locale);
export const getNow = (locale: Locale) => ({ updated: now.updated, text: now[locale].text });
