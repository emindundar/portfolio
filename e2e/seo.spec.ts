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

async function ld(page: import("@playwright/test").Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((b) => { const v = JSON.parse(b); return Array.isArray(v) ? v : [v]; });
}

test("every page carries Person and WebSite data; a case adds a CreativeWork by that person", async ({ page }) => {
  await page.goto("/tr");
  const home = await ld(page);
  const person = home.find((x) => x["@type"] === "Person");
  expect(person).toMatchObject({ name: "Emin Dündar", jobTitle: "Yazılım Geliştirici" });
  expect(person.sameAs).toHaveLength(2);
  expect(person.knowsAbout.length).toBeGreaterThanOrEqual(5);
  expect(person.knowsAbout.length).toBeLessThanOrEqual(30);
  expect(new Set(person.knowsAbout).size).toBe(person.knowsAbout.length);
  const site = home.find((x) => x["@type"] === "WebSite");
  expect(site).toMatchObject({ inLanguage: "tr" });
  expect(site.publisher["@id"]).toBe(person["@id"]);

  await page.goto("/tr/work/geotrack");
  const work = (await ld(page)).find((x) => x["@type"] === "CreativeWork");
  expect(work.author["@id"]).toBe(person["@id"]);
  expect(new URL(work.url).pathname).toBe("/tr/work/geotrack");
  expect(work.name).toBe(await page.getByRole("heading", { level: 1 }).innerText());
});
