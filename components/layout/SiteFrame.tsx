import { NextIntlClientProvider } from "next-intl";
import { fontClassNames } from "@/lib/fonts";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { Analytics } from "./Analytics";
import { ThemeScript } from "./ThemeScript";
import { MotionProvider } from "@/components/motion/MotionProvider";

type Props = {
  locale: string;
  /** Rendered at the top of <body>, outside the providers (structured data). */
  prelude?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * The localized document: <html lang>, theme before paint, nav, footer. Shared by the locale layout and the
 * localized branch of app/global-not-found.tsx, which bypasses every layout. Callers make the locale available to
 * next-intl first (root param in the layout, setRequestLocale in the global 404).
 */
export function SiteFrame({ locale, prelude, children }: Props) {
  return (
    <html lang={locale} className={fontClassNames} suppressHydrationWarning>
      {/* eslint-disable-next-line @next/next/no-head-element -- App Router root document (the rule targets pages/) */}
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-dvh flex-col bg-bg text-fg font-sans">
        {prelude}
        <NextIntlClientProvider>
          <MotionProvider>
            <Nav />
            <div className="flex-1">{children}</div>
            <Footer />
          </MotionProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
