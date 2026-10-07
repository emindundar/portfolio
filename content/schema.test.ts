// @vitest-environment node
// velite imports esbuild, which fails its TextEncoder invariant under jsdom.
import { describe, it, expect } from "vitest";
import { projectMetaSchema, FACETS } from "./schema";

const valid = {
  slug: "geotrack",
  facets: ["mobile", "backend"],
  stack: ["Flutter", "Riverpod"],
  year: 2026,
  role: "solo",
  featured: true,
  order: 1,
  cover: { type: "image", src: "/media/geotrack/cover.webp", frame: "phone" },
  links: { repo: ["https://github.com/emindundar/map_tracking"] },
};

describe("projectMetaSchema", () => {
  it("accepts a valid meta object", () => {
    expect(projectMetaSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects an unknown facet", () => {
    const r = projectMetaSchema.safeParse({ ...valid, facets: ["mobile", "blockchain"] });
    expect(r.success).toBe(false);
  });
  it("rejects more than three facets", () => {
    const r = projectMetaSchema.safeParse({ ...valid, facets: ["mobile", "web", "backend", "ai"] });
    expect(r.success).toBe(false);
  });
  it("rejects an empty facet list", () => {
    expect(projectMetaSchema.safeParse({ ...valid, facets: [] }).success).toBe(false);
  });
  it("rejects uppercase or spaced slugs", () => {
    expect(projectMetaSchema.safeParse({ ...valid, slug: "Geo Track" }).success).toBe(false);
  });
  it("defaults featured to false and links to empty object", () => {
    const rest: Partial<typeof valid> = { ...valid };
    delete rest.featured;
    delete rest.links;
    const r = projectMetaSchema.parse(rest);
    expect(r.featured).toBe(false);
    expect(r.links).toEqual({});
  });
  it("exposes exactly five facets", () => {
    expect(FACETS).toEqual(["mobile", "web", "backend", "ai", "data-erp"]);
  });
});
