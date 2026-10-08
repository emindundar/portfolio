import type { Locale } from "@/i18n/routing";

// All dates are built and formatted in UTC from the string parts: no current-time access (cacheComponents)
// and no timezone drift between build machine and viewer.
function utc(y: number | undefined, m: number | undefined, d = 1): Date {
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d));
}

export function formatPoint(value: string, locale: Locale): string {
  const [y, m] = value.split("-").map(Number);
  if (!m) return String(y);
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(utc(y, m)).replace("Sept", "Sep");
}

/**
 * `from`/`to` are `YYYY-MM` or `YYYY`. Null/undefined `to` = ongoing, rendered with `present` (a translated label,
 * messages `About.present`). Empty `from` = no date (certificates).
 */
export function formatRange(from: string, to: string | null | undefined, locale: Locale, present: string): string {
  if (!from) return "";
  const start = formatPoint(from, locale);
  if (to == null) return `${start} — ${present}`;
  const end = formatPoint(to, locale);
  return start === end ? start : `${start} — ${end}`;
}

export function formatDate(iso: string, locale: Locale): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(utc(y, m, d)).replace("Sept", "Sep");
}

export function formatCoords(lat: number, lng: number): string {
  return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? "E" : "W"}`;
}
