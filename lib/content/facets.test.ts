import { describe, it, expect } from "vitest";
import { facetCounts } from "./facets";
import type { Project } from "./merge";

const p = (slug: string, facets: Project["facets"]): Project =>
  ({ slug, facets, stack: [], year: 2026, role: "solo", featured: false, order: 1,
     cover: { type: "image", src: "", frame: "none" }, links: {},
     title: slug, summary: "", code: "", locale: "en", fallback: false }) as Project;

describe("facetCounts", () => {
  it("counts projects per facet, zero for unused facets", () => {
    const out = facetCounts([p("a", ["mobile", "ai"]), p("b", ["mobile"])]);
    expect(out).toEqual({ mobile: 2, web: 0, backend: 0, ai: 1, "data-erp": 0 });
  });
  it("returns all zeros for no projects", () => {
    expect(Object.values(facetCounts([])).every((n) => n === 0)).toBe(true);
  });
});
