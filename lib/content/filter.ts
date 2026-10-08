import { FACETS, type Facet } from "@/content/facet-list";
import type { Project } from "./merge";

/** `?f=` value → known facet, or null (missing, unknown, empty). A repeated parameter uses its first value. */
export function parseFacet(q: string | string[] | undefined): Facet | null {
  const v = Array.isArray(q) ? q[0] : q;
  return (FACETS as readonly string[]).includes(v ?? "") ? (v as Facet) : null;
}

/** Keeps the incoming (already ordered) sequence. */
export function filterProjects(projects: Project[], facet: Facet | null): Project[] {
  return facet ? projects.filter((p) => p.facets.includes(facet)) : projects;
}
