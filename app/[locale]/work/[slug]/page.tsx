import type { Metadata } from "next";
import { ViewTransition } from "react";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "@/lib/seo";
import { getProjects, getProject } from "@/lib/content";
import { FACET_LABEL_KEYS } from "@/lib/content/facets";
import { MDXContent } from "@/components/mdx/MDXContent";
import { MediaCover } from "@/components/media/MediaCover";
import { CaseHeader } from "@/components/case/CaseHeader";
import { CaseAside } from "@/components/case/CaseAside";
import { CaseGallery } from "@/components/case/CaseGallery";
import { CaseNav } from "@/components/case/CaseNav";

type Props = { params: Promise<{ locale: string; slug: string }> };

// Forces the whole route to be prerendered; with cacheComponents this also makes unknown slugs return a real 404
// (pinned by e2e/case.spec.ts).
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => getProjects(locale).map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const p = getProject(locale, slug);
  if (!p) return {};
  return { title: p.title, description: p.summary, alternates: alternatesFor(`/work/${slug}`, locale) };
}

// Hero sizing lives here, not in MediaCover: the phone frame is capped to ~70% of the viewport height
// (width = height × 9/19.5), a frameless image gets breathing room instead of being upscaled, and the
// typographic cover becomes a wide band on desktop instead of a 4:3 block taller than the fold.
const HERO_BOX =
  "mt-8 md:mt-12 " +
  "[&_[data-frame=phone]]:max-w-[min(20rem,32svh)] " +
  "[&_[data-frame=none]]:p-6 md:[&_[data-frame=none]]:p-12 " +
  "[&_[data-typo-cover]]:aspect-auto [&_[data-typo-cover]]:min-h-64 [&_[data-typo-cover]]:gap-8 md:[&_[data-typo-cover]]:min-h-80";

export default async function CasePage({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const all = getProjects(locale);
  const idx = all.findIndex((p) => p.slug === slug);
  const project = all[idx];
  if (!project) notFound();
  const t = await getTranslations("Case");
  const tc = await getTranslations("Capabilities");
  const facetLabels = project.facets.map((f) => tc(FACET_LABEL_KEYS[f]));

  return (
    <main className="px-4 py-12 md:px-6 md:py-16">
      {project.fallback && (
        <p role="note" className="mb-6 border border-line px-3 py-2 font-mono text-sm text-muted">
          {t("fallbackNote")}
        </p>
      )}
      {/* The <h1> stays above the cover and is the LCP element; the cover is never fetched with priority. */}
      <CaseHeader project={project} facetLabels={facetLabels} />
      <div className={HERO_BOX}>
        <ViewTransition name={`cover-${project.slug}`} share="morph" default="none">
          <MediaCover project={project} kind="hero" facetLabels={facetLabels} />
        </ViewTransition>
      </div>
      <div className="mt-12 grid gap-12 md:mt-16 md:grid-cols-12 md:gap-x-6">
        <article className="prose-brutal min-w-0 md:col-span-8">
          <MDXContent code={project.code} />
        </article>
        <CaseAside project={project} className="md:col-span-4" />
      </div>
      {project.gallery && <CaseGallery items={project.gallery} locale={locale} />}
      <CaseNav prev={all[idx - 1]} next={all[idx + 1]} />
    </main>
  );
}
