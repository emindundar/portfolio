import type { Metadata } from "next";
import { headers } from "next/headers";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";
import { fontClassNames } from "@/lib/fonts";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { SiteFrame } from "@/components/layout/SiteFrame";
import { NotFoundView } from "@/components/layout/NotFoundView";
import { buttonClasses } from "@/components/ui/Button";
import "./globals.css";

// Answers every URL that matches no route: unknown paths under a locale (`/tr/wrok`), unknown case slugs and locales
// (closed by `unstable_paramMatching`), and paths the proxy skips (`/static/missing.png`). Next.js sets the 404 status
// before rendering, so the page is server-rendered with a real 404.
//
// It is rendered per request on purpose: the proxy (next-intl) puts the locale of the requested path into the
// X-NEXT-INTL-LOCALE request header, and reading it is what makes a localized page with the right <html lang> and the
// site chrome possible. `instant = false` opts this route out of the static-shell requirement of cacheComponents.
export const instant = false;

const LOCALE_HEADER = "x-next-intl-locale";
const BLOCKS = [
  { lang: "en", href: "/en", m: en.NotFound },
  { lang: "tr", href: "/tr", m: tr.NotFound },
] as const;

async function requestedLocale(): Promise<Locale | null> {
  const value = (await headers()).get(LOCALE_HEADER);
  return hasLocale(routing.locales, value) ? value : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await requestedLocale();
  const m = locale === "tr" ? tr.NotFound : en.NotFound;
  return { title: `404 — ${m.title}` };
}

export default async function GlobalNotFound() {
  const locale = await requestedLocale();
  if (locale) {
    setRequestLocale(locale);
    return (
      <SiteFrame locale={locale}>
        <NotFoundView />
      </SiteFrame>
    );
  }
  return <BilingualNotFound />;
}

// No locale in the URL (the proxy did not run): both languages, English first. Plain anchors, no next-intl context.
function BilingualNotFound() {
  return (
    <html lang="en" className={fontClassNames} suppressHydrationWarning>
      <head>
        {/* Reads the saved `theme` cookie on the client before paint, like every other page; without it the
            prefers-color-scheme rules in globals.css decide. */}
        <ThemeScript />
      </head>
      <body className="flex min-h-dvh flex-col bg-bg text-fg font-sans">
        <main className="flex flex-1 flex-col justify-center px-4 py-16 md:px-6">
          <p className="font-mono text-sm uppercase tracking-wide text-muted">404</p>
          {BLOCKS.map(({ lang, href, m }, i) => {
            const Heading = i === 0 ? "h1" : "h2";
            return (
              <section key={lang} lang={lang} className={i === 0 ? "mt-4" : "mt-12 border-t border-line pt-12"}>
                <Heading className="font-display text-[clamp(2.5rem,8vw,6rem)] leading-none">{m.title}</Heading>
                <p className="mt-4 max-w-xl text-muted">{m.body}</p>
                <a href={href} className={buttonClasses("ghost", "mt-8")}>
                  {m.backHome} <span aria-hidden="true">→</span>
                </a>
              </section>
            );
          })}
        </main>
      </body>
    </html>
  );
}
