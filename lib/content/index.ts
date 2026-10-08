import { projectMeta, projectContent } from "#site/content";
import type { Locale } from "@/i18n/routing";
import { mergeProjects, type Project } from "./merge";

export type { Project };
export { getTimeline, getServices, getEvents } from "./site";
export { orgName } from "./localize";

export function getProjects(locale: Locale): Project[] {
  return mergeProjects(projectMeta, projectContent, locale);
}

export function getProject(locale: Locale, slug: string): Project | undefined {
  return getProjects(locale).find((p) => p.slug === slug);
}
