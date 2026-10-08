import { describe, it, expect } from "vitest";
import { parseFacet, filterProjects } from "./filter";
import type { Project } from "./merge";

const p = (slug: string, facets: Project["facets"]): Project =>
  ({ slug, facets, stack: [], year: 2026, role: "solo", featured: false, order: 1, links: {}, title: slug, summary: "", code: "", locale: "en", fallback: false }) as Project;

describe("parseFacet", () => {
  it("accepts known facets only", () => {
    expect(parseFacet("ai")).toBe("ai");
    expect(parseFacet("data-erp")).toBe("data-erp");
    expect(parseFacet("nope")).toBeNull();
    expect(parseFacet("")).toBeNull();
    expect(parseFacet(undefined)).toBeNull();
  });
  it("uses the first value of a repeated parameter", () => {
    expect(parseFacet(["web", "ai"])).toBe("web");
    expect(parseFacet(["nope", "ai"])).toBeNull();
    expect(parseFacet([])).toBeNull();
  });
});

describe("filterProjects", () => {
  it("returns all for null, filtered otherwise, keeps order", () => {
    const all = [p("a", ["ai"]), p("b", ["mobile"]), p("c", ["ai", "web"])];
    expect(filterProjects(all, null).map((x) => x.slug)).toEqual(["a", "b", "c"]);
    expect(filterProjects(all, "ai").map((x) => x.slug)).toEqual(["a", "c"]);
    expect(filterProjects(all, "data-erp")).toEqual([]);
  });
});
