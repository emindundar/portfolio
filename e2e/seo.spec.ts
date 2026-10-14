import { test, expect } from "@playwright/test";
import { FACETS } from "../content/facet-list";
import { KNOWS_ABOUT } from "../lib/site";

const CASES = ["bio-astral", "cursor-notion-mcp", "geotrack", "gymai", "karaoke-sync", "kipgoz", "notifyx"];
const PAGES = ["", "/work", "/about", "/services", "/colophon", "/contact", ...CASES.map((slug) => `/work/${slug}`)];

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
    test(`${locale}${page || "/"}: canonical, hreflang and Open Graph are complete and self-consistent`, async ({ page: p, request }) => {
      await p.goto(`/${locale}${page}`);
      const canonical = await p.locator('link[rel="canonical"]').getAttribute("href");
      expect(new URL(canonical!).pathname).toBe(`/${locale}${page}`);
      const ogUrl = await p.locator('meta[property="og:url"]').getAttribute("content");
      expect(ogUrl).toBe(canonical);
      for (const [l, target] of [["en", "en"], ["tr", "tr"], ["x-default", "en"]] as const) {
        const alt = p.locator(`link[rel="alternate"][hreflang="${l}" i]`);
        await expect(alt).toHaveCount(1);
        expect(new URL((await alt.getAttribute("href"))!, p.url()).pathname, l).toBe(`/${target}${page}`);
      }
      await expect(p.locator('meta[property="og:locale"]')).toHaveAttribute("content", locale === "tr" ? "tr_TR" : "en_US");
      await expect(p.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "Emin Dündar");
      await expect(p.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
      const title = await p.title();
      const ogTitle = await p.locator('meta[property="og:title"]').getAttribute("content");
      expect(title).toContain(ogTitle!.replace(/ — Emin Dündar$/, ""));
      expect(title.length, title).toBeLessThanOrEqual(70);
      const desc = await p.locator('meta[name="description"]').getAttribute("content");
      expect(desc!.length).toBeGreaterThanOrEqual(50);
      expect(desc!.length).toBeLessThanOrEqual(170);
      await expect(p.locator('meta[property="og:description"]')).toHaveAttribute("content", desc!);
      // Preview image: one og:image on the canonical host, the same URL for Twitter/X, and it really is a PNG.
      const ogImage = p.locator('meta[property="og:image"]');
      await expect(ogImage).toHaveCount(1);
      const image = new URL((await ogImage.getAttribute("content"))!);
      expect(image.origin).toBe(new URL(canonical!).origin);
      await expect(p.locator('meta[name="twitter:image"]')).toHaveAttribute("content", image.href);
      // The absolute URL names the configured site origin (localhost:3000 in local builds); fetch it from this server.
      const res = await request.get(image.pathname + image.search);
      expect(res.status(), image.pathname).toBe(200);
      expect(res.headers()["content-type"]).toBe("image/png");
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
  expect(person.knowsAbout).toHaveLength(FACETS.length + KNOWS_ABOUT.length);
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

for (const path of ["/en", "/tr/about", "/tr/work/geotrack"]) {
  test(`${path}: og:image and twitter:image are a real 1200×630 PNG on this origin`, async ({ page, request }) => {
    await page.goto(path);
    const src = await page.locator('meta[property="og:image"]').getAttribute("content");
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", src!);
    const res = await request.get(new URL(src!).pathname + new URL(src!).search);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
    const buf = await res.body();
    expect(buf.readUInt32BE(16)).toBe(1200); // PNG IHDR width
    expect(buf.readUInt32BE(20)).toBe(630);
    expect(buf.length).toBeLessThan(300_000);
  });
}

test("the Turkish case image differs from the English one (localized title)", async ({ page, request }) => {
  const get = async (p: string) => {
    await page.goto(p);
    const u = new URL((await page.locator('meta[property="og:image"]').getAttribute("content"))!);
    return (await request.get(u.pathname + u.search)).body();
  };
  expect((await get("/en/work/geotrack")).equals(await get("/tr/work/geotrack"))).toBe(false);
});

test("the case JSON-LD image is the case's Open Graph image", async ({ page, request }) => {
  await page.goto("/en/work/geotrack");
  const work = (await ld(page)).find((n) => n["@type"] === "CreativeWork");
  const res = await request.get(new URL(String(work!.image)).pathname);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
});
