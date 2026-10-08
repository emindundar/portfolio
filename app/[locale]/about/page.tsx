import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DownloadButton } from "@/components/ui/Button";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { AboutHero } from "@/components/about/AboutHero";
import { Timeline } from "@/components/about/Timeline";
import { HowIWork } from "@/components/about/HowIWork";
import { EventsStrip } from "@/components/about/EventsStrip";
import { Certificates } from "@/components/about/Certificates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "About" });
  return { title: t("title"), description: t("description"), alternates: alternatesFor("/about", locale) };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "About" });
  return (
    <main>
      <AboutHero title={t("title")} intro={t("intro")} portraitAlt={t("title")} />
      <section className="px-4 py-12 md:px-6">
        <SectionHeader number="01" title={t("timelineHeading")} />
        <SectionReveal><Timeline locale={locale} present={t("present")} /></SectionReveal>
      </section>
      <section className="px-4 py-12 md:px-6">
        <SectionHeader number="02" title={t("howHeading")} />
        <SectionReveal><HowIWork /></SectionReveal>
      </section>
      <section className="px-4 py-12 md:px-6">
        <SectionHeader number="03" title={t("eventsHeading")} />
        <SectionReveal><EventsStrip locale={locale} /></SectionReveal>
      </section>
      <section className="px-4 py-12 md:px-6">
        <SectionHeader number="04" title={t("certsHeading")} />
        <SectionReveal><Certificates locale={locale} /></SectionReveal>
      </section>
      <section className="px-4 py-12 md:px-6">
        <SectionHeader number="05" title={t("cvHeading")} />
        <SectionReveal className="flex flex-wrap gap-4">
          <div data-reveal><DownloadButton href="/cv/Emin_Dundar_CV_en.pdf">{t("cvDownloadEn")}</DownloadButton></div>
          <div data-reveal><DownloadButton href="/cv/Emin_Dundar_CV_tr.pdf">{t("cvDownloadTr")}</DownloadButton></div>
        </SectionReveal>
      </section>
    </main>
  );
}
