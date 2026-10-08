import { describe, it, expect, vi } from "vitest";
import { mergeProjects, type ProjectContent } from "./merge";
import type { ProjectMeta } from "@/content/schema";

const meta = (slug: string, order: number): ProjectMeta => ({
  slug,
  facets: ["mobile"],
  stack: ["Flutter"],
  year: 2026,
  role: "solo",
  featured: false,
  order,
  cover: { type: "image", src: `/media/${slug}/cover`, frame: "phone" },
  links: {},
});

const content = (slug: string, locale: "en" | "tr"): ProjectContent => ({
  slug,
  locale,
  title: `${slug} ${locale}`,
  summary: `summary of ${slug} in ${locale} language`,
  code: "",
});

describe("mergeProjects", () => {
  it("merges meta with the requested locale content", () => {
    const out = mergeProjects([meta("a", 1)], [content("a", "en"), content("a", "tr")], "tr");
    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe("a tr");
    expect(out[0]?.locale).toBe("tr");
    expect(out[0]?.fallback).toBe(false);
  });
  it("falls back to en when the locale file is missing and warns", () => {
    const warn = vi.fn();
    const out = mergeProjects([meta("a", 1)], [content("a", "en")], "tr", warn);
    expect(out[0]?.title).toBe("a en");
    expect(out[0]?.fallback).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("a"));
  });
  it("throws when neither locale exists", () => {
    expect(() => mergeProjects([meta("a", 1)], [], "en")).toThrow(/a/);
  });
  it("sorts by order ascending", () => {
    const out = mergeProjects(
      [meta("b", 2), meta("a", 1)],
      [content("a", "en"), content("b", "en")],
      "en",
    );
    expect(out.map((p) => p.slug)).toEqual(["a", "b"]);
  });
  it("throws on duplicate slugs in meta", () => {
    expect(() => mergeProjects([meta("a", 1), meta("a", 2)], [content("a", "en")], "en")).toThrow(
      /duplicate/,
    );
  });
});
