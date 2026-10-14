import { test, expect } from "@playwright/test";

const PAGES = ["", "/work", "/about", "/services", "/colophon", "/contact", "/work/geotrack"];

test("robots.txt allows everything and names the sitemap", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/User-Agent: \*/i);
  expect(body).toMatch(/Allow: \//);
  expect(body).not.toMatch(/^Host:/im);
  expect(body).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);
});

test("every sitemap URL resolves on this server and has hreflang pairs", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  expect(locs.length).toBeGreaterThanOrEqual(PAGES.length * 2);
  expect(xml).toMatch(/hreflang="x-default"/);
  expect(xml).not.toMatch(/<lastmod>/);
  for (const path of locs) expect((await request.get(path)).status(), path).toBe(200);
});

for (const locale of ["en", "tr"] as const) {
  for (const page of PAGES) {
    test(`${locale}${page || "/"}: canonical, hreflang and Open Graph are complete and self-consistent`, async ({ page: p }) => {
      await p.goto(`/${locale}${page}`);
      const canonical = await p.locator('link[rel="canonical"]').getAttribute("href");
      expect(new URL(canonical!).pathname).toBe(`/${locale}${page}`);
      const ogUrl = await p.locator('meta[property="og:url"]').getAttribute("content");
      expect(ogUrl).toBe(canonical);
      for (const l of ["en", "tr", "x-default"]) await expect(p.locator(`link[rel="alternate"][hreflang="${l}" i]`)).toHaveCount(1);
      await expect(p.locator('meta[property="og:locale"]')).toHaveAttribute("content", locale === "tr" ? "tr_TR" : "en_US");
      await expect(p.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "Emin Dündar");
      await expect(p.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
      const title = await p.title();
      const ogTitle = await p.locator('meta[property="og:title"]').getAttribute("content");
      expect(title).toContain(ogTitle!.replace(/ — Emin Dündar$/, ""));
      const desc = await p.locator('meta[name="description"]').getAttribute("content");
      expect(desc!.length).toBeGreaterThanOrEqual(50);
      expect(desc!.length).toBeLessThanOrEqual(170);
    });
  }
}
