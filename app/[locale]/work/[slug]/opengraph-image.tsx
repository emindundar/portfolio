import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getProject, getProjects } from "@/lib/content";
import { FACET_LABEL_KEYS } from "@/lib/content/facets";
import { ogFonts } from "@/lib/og/fonts";
import { OG_SIZE, OgTemplate } from "@/lib/og/template";
import { SITE_URL } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Emin Dündar";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => getProjects(locale).map((p) => ({ locale, slug: p.slug })));
}

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const project = getProject(locale, slug);
  if (!project) notFound();
  const tc = await getTranslations({ locale, namespace: "Capabilities" });
  const eyebrow = [...project.facets.map((f) => tc(FACET_LABEL_KEYS[f])), String(project.year)].join(" · ");
  // Same text as the page's <title> / og:title.
  const title = project.seoTitle ?? project.title;
  return new ImageResponse(<OgTemplate eyebrow={eyebrow} title={title} footer={new URL(SITE_URL).host} locale={locale} />, { ...size, fonts: await ogFonts() });
}
