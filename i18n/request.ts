import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale, requestLocale }) => {
  if (!locale) {
    // Inside app/[locale] the root param decides (static). app/global-not-found.tsx has no root param; it validates
    // the proxy's locale header and calls setRequestLocale(), which is what `requestLocale` returns there.
    const candidate = (await rootParams.locale()) ?? (await requestLocale);
    if (hasLocale(routing.locales, candidate)) {
      locale = candidate;
    } else {
      notFound();
    }
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
