import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing, type Locale } from "./routing";

// Picks the locale for a request. `readRequestLocale` is called ONLY when there is no root param: next-intl's
// `requestLocale` getter falls back to `headers()`, and touching it on a static page makes that page call headers().
export async function resolveLocale(
  rootLocale: string | undefined,
  readRequestLocale: () => Promise<string | undefined>,
): Promise<Locale | null> {
  const candidate = rootLocale ?? (await readRequestLocale());
  return hasLocale(routing.locales, candidate) ? candidate : null;
}

// `params` is not destructured on purpose: destructuring would read the `requestLocale` getter on every page.
export default getRequestConfig(async (params) => {
  let locale = params.locale;
  if (!locale) {
    // Inside app/[locale] the root param decides (static). app/global-not-found.tsx has no root param; it validates
    // the proxy's locale header and calls setRequestLocale(), which is what `requestLocale` returns there.
    const resolved = await resolveLocale(await rootParams.locale(), () => params.requestLocale);
    if (!resolved) notFound();
    locale = resolved;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
