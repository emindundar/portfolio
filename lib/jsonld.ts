import type { Locale } from "@/i18n/routing";
import type { Project } from "@/lib/content";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";
import { GITHUB_URL, LINKEDIN_URL } from "@/lib/site";

export type Ld = Record<string, unknown>;
const CONTEXT = "https://schema.org";
const PERSON_ID = `${SITE_URL}/#person`;

export function personLd(input: { locale: Locale; jobTitle: string; description: string; knowsAbout: string[] }): Ld {
  return {
    "@context": CONTEXT, "@type": "Person", "@id": PERSON_ID, name: SITE_NAME, url: absoluteUrl(`/${input.locale}`),
    jobTitle: input.jobTitle, description: input.description, knowsAbout: input.knowsAbout, sameAs: [GITHUB_URL, LINKEDIN_URL],
  };
}

export function websiteLd(input: { locale: Locale; description: string }): Ld {
  return {
    "@context": CONTEXT, "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: absoluteUrl(`/${input.locale}`),
    name: SITE_NAME, description: input.description, inLanguage: input.locale, publisher: { "@id": PERSON_ID },
  };
}

export function caseLd(input: { locale: Locale; project: Pick<Project, "slug" | "title" | "summary" | "year" | "stack">; image?: string }): Ld {
  const { locale, project, image } = input;
  const url = absoluteUrl(`/${locale}/work/${project.slug}`);
  return {
    "@context": CONTEXT, "@type": "CreativeWork", "@id": `${url}#work`, url, name: project.title, description: project.summary,
    inLanguage: locale, dateCreated: String(project.year), keywords: project.stack.join(", "), author: { "@id": PERSON_ID },
    ...(image ? { image: absoluteUrl(image) } : {}),
  };
}

/** Facet labels first, then every project's stack; de-duplicated in order of first appearance, capped. */
export function knowsAboutFrom(facetLabels: string[], stacks: string[][], cap = 30): string[] {
  return [...new Set([...facetLabels, ...stacks.flat()])].slice(0, cap);
}

const ESCAPES: Record<string, string> = { "<": "\\u003c", ">": "\\u003e", "&": "\\u0026", "\u2028": "\\u2028", "\u2029": "\\u2029" };
/** JSON that is safe inside a <script> element: no `<`, `>`, `&` or JS line separators survive. */
export function serializeLd(data: Ld | Ld[]): string {
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (c) => ESCAPES[c]!);
}
