import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { getProjects } from "@/lib/content";
import { Hero } from "@/components/home/Hero";
import { NowPanel } from "@/components/home/NowPanel";
import { Capabilities } from "@/components/home/Capabilities";
import { FeaturedProjects } from "@/components/home/FeaturedProjects";
import { AboutTeaser } from "@/components/home/AboutTeaser";
import { ContactCta } from "@/components/home/ContactCta";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  return { alternates: alternatesFor("/", locale) };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const projects = getProjects(locale);

  return (
    <main>
      <Hero />
      <NowPanel locale={locale} />
      <Capabilities projects={projects} />
      <FeaturedProjects projects={projects} />
      <AboutTeaser />
      <ContactCta />
    </main>
  );
}
