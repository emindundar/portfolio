import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SITE_URL, openGraphFor } from "@/lib/seo";
import { FACETS } from "@/content/facet-list";
import { FACET_LABEL_KEYS } from "@/lib/content/facets";
import { personLd, websiteLd } from "@/lib/jsonld";
import { KNOWS_ABOUT } from "@/lib/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { SiteFrame } from "@/components/layout/SiteFrame";
import "../globals.css";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

// Any other first segment (e.g. `/apple-touch-icon.png`, which the proxy skips because it has a dot) is not this
// route at all: Next.js answers with app/global-not-found.tsx (server-rendered, real 404) instead of rendering this
// layout and throwing notFound(), which under cacheComponents only produced a client-rendered error shell.
export const unstable_paramMatching = { locale: "not-found" };

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
  const knowsAbout = [...new Set([...FACETS.map((f) => tc(FACET_LABEL_KEYS[f])), ...KNOWS_ABOUT])];

  return (
    <SiteFrame
      locale={locale}
      prelude={
        <JsonLd
          data={[
            personLd({ locale, jobTitle: tm("jobTitle"), description: tm("description"), knowsAbout }),
            websiteLd({ locale, description: tm("description") }),
          ]}
        />
      }
    >
      {children}
    </SiteFrame>
  );
}
