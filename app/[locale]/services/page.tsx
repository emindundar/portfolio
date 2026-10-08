import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { getServices } from "@/lib/content";
import { FACET_LABEL_KEYS } from "@/lib/content/facets";
import { Button } from "@/components/ui/Button";
import { SectionReveal } from "@/components/motion/SectionReveal";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Services" });
  return { title: t("title"), description: t("description"), alternates: alternatesFor("/services", locale) };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Services" });
  const tc = await getTranslations({ locale, namespace: "Capabilities" });
  const services = getServices(locale);
  return (
    <main className="px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-[clamp(2.5rem,8vw,6rem)] leading-none">{t("title")}</h1>
      <p className="mt-4 max-w-xl text-muted">{t("intro")}</p>
      <SectionReveal className="mt-12 grid gap-px border border-line bg-line md:grid-cols-2">
        {services.map((s) => (
          <article key={s.slug} data-reveal className="flex flex-col gap-4 bg-bg p-6 md:p-8">
            <p className="font-mono text-xs uppercase tracking-wide text-muted">{tc(FACET_LABEL_KEYS[s.facet])}</p>
            <h2 className="font-display text-3xl leading-tight">{s.text.title}</h2>
            <p className="max-w-prose leading-relaxed">{s.text.body}</p>
            <Link
              href={`/work/${s.caseSlug}`}
              aria-label={`${t("seeCase")}: ${s.text.title}`}
              className="mt-auto inline-flex min-h-11 items-center self-start font-mono text-sm text-accent underline underline-offset-4"
            >
              {t("seeCase")} →
            </Link>
          </article>
        ))}
      </SectionReveal>
      <div className="mt-12">
        <Button href="/contact">{t("cta")}</Button>
      </div>
    </main>
  );
}
