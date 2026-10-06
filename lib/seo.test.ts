import { describe, it, expect } from "vitest";
import { alternatesFor, SITE_URL } from "./seo";

describe("alternatesFor", () => {
  it("builds canonical and hreflang map for a path", () => {
    expect(alternatesFor("/work", "tr")).toEqual({
      canonical: "/tr/work",
      languages: {
        en: "/en/work",
        tr: "/tr/work",
        "x-default": "/en/work",
      },
    });
  });
  it("handles root path without double slashes", () => {
    expect(alternatesFor("/", "en")).toEqual({
      canonical: "/en",
      languages: { en: "/en", tr: "/tr", "x-default": "/en" },
    });
  });
  it("adds a missing leading slash", () => {
    expect(alternatesFor("work", "en")).toEqual({
      canonical: "/en/work",
      languages: { en: "/en/work", tr: "/tr/work", "x-default": "/en/work" },
    });
  });
  it("exposes the production site url", () => {
    expect(SITE_URL).toBe("https://emindundar.dev");
  });
});
