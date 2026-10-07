import { FACETS, type Facet } from "@/content/facet-list";
import type { Project } from "./merge";

export const FACET_LABEL_KEYS: Record<Facet, string> = {
  mobile: "mobile",
  web: "web",
  backend: "backend",
  ai: "ai",
  "data-erp": "dataErp",
};

export function facetCounts(projects: Project[]): Record<Facet, number> {
  const out = Object.fromEntries(FACETS.map((f) => [f, 0])) as Record<Facet, number>;
  for (const p of projects) for (const f of p.facets) out[f] += 1;
  return out;
}
