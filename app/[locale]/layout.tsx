import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { fontClassNames } from "@/lib/fonts";
import { SITE_URL, openGraphFor } from "@/lib/seo";
import { getProjects } from "@/lib/content";
import { FACETS } from "@/content/facet-list";
import { FACET_LABEL_KEYS } from "@/lib/content/facets";
import { knowsAboutFrom, personLd, websiteLd } from "@/lib/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Analytics } from "@/components/layout/Analytics";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { MotionProvider } from "@/components/motion/MotionProvider";
import "../globals.css";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: "%s — Emin Dündar" },
    description: t("description"),
    ...openGraphFor({ path: "/", locale, title: t("title"), description: t("description") }),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const tm = await getTranslations({ locale, namespace: "Meta" });
  const tc = await getTranslations({ locale, namespace: "Capabilities" });
  const knowsAbout = knowsAboutFrom(
    FACETS.map((f) => tc(FACET_LABEL_KEYS[f])),
    getProjects(locale).map((p) => p.stack),
  );

  return (
    <html lang={locale} className={fontClassNames} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-dvh flex-col bg-bg text-fg font-sans">
        <JsonLd
          data={[
            personLd({ locale, jobTitle: tm("jobTitle"), description: tm("description"), knowsAbout }),
            websiteLd({ locale, description: tm("description") }),
          ]}
        />
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
