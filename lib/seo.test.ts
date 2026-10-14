import { describe, it, expect } from "vitest";
import { alternatesFor, resolveSiteUrl, absoluteUrl, openGraphFor, PAGE_PATHS, SITE_URL } from "./seo";

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
  it("exposes an origin without a trailing slash", () => {
    expect(SITE_URL).toMatch(/^https?:\/\/[^/]+$/);
  });
});

describe("resolveSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL and strips a trailing slash", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://emindundar.dev/", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe("https://emindundar.dev");
  });
  it("falls back to the Vercel production host", () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "eminsportfolio.vercel.app" })).toBe("https://eminsportfolio.vercel.app");
  });
  it("falls back to localhost when nothing is set", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });
  it.each(["ftp://x.dev", "javascript:alert(1)", "not a url", "https://"])("ignores an invalid value %j", (bad) => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: bad, VERCEL_PROJECT_PRODUCTION_URL: "a.vercel.app" })).toBe("https://a.vercel.app");
  });
  it("drops any path, query or hash from the configured value", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://emindundar.dev/tr?x=1#y" })).toBe("https://emindundar.dev");
  });
});

describe("absoluteUrl / openGraphFor", () => {
  it("joins the origin and a path", () => {
    expect(absoluteUrl("/en/work")).toBe(`${SITE_URL}/en/work`);
    expect(absoluteUrl("en")).toBe(`${SITE_URL}/en`);
  });
  it("builds Open Graph and Twitter metadata for a page", () => {
    const m = openGraphFor({ path: "/work/geotrack", locale: "tr", title: "T", description: "D", type: "article" });
    expect(m.openGraph).toMatchObject({ type: "article", url: "/tr/work/geotrack", title: "T", description: "D", siteName: "Emin Dündar", locale: "tr_TR", alternateLocale: ["en_US"] });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "T", description: "D" });
  });
  it("points pages without an image file at the locale image, and leaves pages that have their own file alone", () => {
    const img = (path: string) => openGraphFor({ path, locale: "tr", title: "T", description: "D" });
    expect(img("/about").openGraph).toMatchObject({ images: [{ url: "/tr/opengraph-image", width: 1200, height: 630, type: "image/png", alt: "Emin Dündar" }] });
    expect(img("/about").twitter).toMatchObject({ images: [{ url: "/tr/opengraph-image", alt: "Emin Dündar" }] });
    expect(img("/work").openGraph).toHaveProperty("images");
    for (const own of ["/", "", "/work/geotrack"]) {
      expect(img(own).openGraph).not.toHaveProperty("images");
      expect(img(own).twitter).not.toHaveProperty("images");
    }
  });
  it("lists every static page once", () => {
    expect(PAGE_PATHS).toEqual(["", "/work", "/about", "/services", "/colophon", "/contact"]);
  });
});
