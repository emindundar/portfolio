import type { Locale } from "@/i18n/routing";
import type { ProjectMeta } from "@/content/schema";

export type ProjectContent = {
  slug: string;
  locale: Locale;
  title: string;
  summary: string;
  metrics?: { label: string; value: string }[];
  code: string;
};

export type Project = ProjectMeta &
  Pick<ProjectContent, "title" | "summary" | "metrics" | "code"> & {
    locale: Locale;
    fallback: boolean;
  };

const FALLBACK_LOCALE: Locale = "en";

export function mergeProjects(
  meta: ProjectMeta[],
  content: ProjectContent[],
  locale: Locale,
  warn: (msg: string) => void = console.warn,
): Project[] {
  const seen = new Set<string>();
  const out: Project[] = [];

  for (const m of meta) {
    if (seen.has(m.slug)) throw new Error(`duplicate project slug: ${m.slug}`);
    seen.add(m.slug);

    const exact = content.find((c) => c.slug === m.slug && c.locale === locale);
    const fb = content.find((c) => c.slug === m.slug && c.locale === FALLBACK_LOCALE);
    const chosen = exact ?? fb;
    if (!chosen) throw new Error(`project "${m.slug}" has no content for ${locale} or ${FALLBACK_LOCALE}`);
    if (!exact) warn(`project "${m.slug}": no ${locale} content, falling back to ${FALLBACK_LOCALE}`);

    out.push({
      ...m,
      title: chosen.title,
      summary: chosen.summary,
      metrics: chosen.metrics,
      code: chosen.code,
      locale: chosen.locale,
      fallback: !exact,
    });
  }

  return out.sort((a, b) => a.order - b.order);
}
