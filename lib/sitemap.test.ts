// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildSitemap } from "@/app/sitemap";
import { SITE_URL } from "./seo";

describe("buildSitemap", () => {
  const map = buildSitemap(["geotrack", "kipgoz"]);
  it("lists every static page and case in both locales", () => {
    const urls = map.map((e) => e.url);
    expect(urls).toHaveLength((6 + 2) * 2);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain(`${SITE_URL}/en`);
    expect(urls).toContain(`${SITE_URL}/tr/contact`);
    expect(urls).toContain(`${SITE_URL}/tr/work/kipgoz`);
  });
  it("gives each entry absolute hreflang alternates including x-default", () => {
    const entry = map.find((e) => e.url === `${SITE_URL}/tr/work/geotrack`)!;
    expect(entry.alternates?.languages).toEqual({
      en: `${SITE_URL}/en/work/geotrack`, tr: `${SITE_URL}/tr/work/geotrack`, "x-default": `${SITE_URL}/en/work/geotrack`,
    });
    expect(entry).not.toHaveProperty("lastModified");
  });
  it("never emits a trailing slash or a double slash in the path", () => {
    for (const e of map) expect(new URL(e.url).pathname).toMatch(/^\/(en|tr)(\/[a-z0-9-]+)*$/);
  });
});
