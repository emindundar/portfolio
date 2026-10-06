import { projectMeta, projectContent } from "#site/content";
import type { Locale } from "@/i18n/routing";
import { mergeProjects, type Project, type ProjectContent } from "./merge";

export type { Project };

export function getProjects(locale: Locale): Project[] {
  return mergeProjects(projectMeta, projectContent as ProjectContent[], locale);
}

export function getProject(locale: Locale, slug: string): Project | undefined {
  return getProjects(locale).find((p) => p.slug === slug);
}
