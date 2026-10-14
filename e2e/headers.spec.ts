import { test, expect, type Page } from "@playwright/test";
import { watchCsp } from "./helpers/csp";

// Security headers (lib/security-headers.ts via next.config.ts headers()) and a CSP that breaks nothing.

test.describe("security headers", () => {
  for (const path of ["/en", "/tr/contact", "/en/work/geotrack", "/sitemap.xml"]) {
    test(`${path} carries the hardening headers`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      const h = res.headers();
      expect(h["content-security-policy"]).toContain("default-src 'self'");
      expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
      expect(h["x-content-type-options"]).toBe("nosniff");
      expect(h["x-frame-options"]).toBe("DENY");
    });
  }

  test("build assets are nosniff only (no document headers on every chunk)", async ({ page, request }) => {
    await page.goto("/en");
    const src = await page.locator('script[src*="/_next/static/"]').first().getAttribute("src");
    const h = (await request.get(src!)).headers();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["content-security-policy"]).toBeUndefined();
  });
});

/** Motion allowed, so the lazy motion/WebGL chunks load; settled once data-motion is set and the network is idle. */
async function load(page: Page, path: string) {
  await page.goto(path);
  if (!path.startsWith("/static/")) await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
  await page.waitForLoadState("networkidle");
}

// Same list as e2e/a11y.spec.ts.
const PAGES = [
  "/en",
  "/tr",
  "/en/work",
  "/en/work/geotrack",
  "/tr/work/karaoke-sync",
  "/en/about",
  "/tr/services",
  "/en/colophon",
  "/tr/contact",
  "/en/does-not-exist",
  "/static/missing.png",
];

test.describe("content security policy breaks nothing", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
  });

  for (const path of PAGES) {
    test(`${path}: no CSP violation`, async ({ page }) => {
      const check = await watchCsp(page);
      await load(page, path);
      await check();
    });
  }

  test("theme toggle, work filter and view transition to a case: no CSP violation", async ({ page }) => {
    const check = await watchCsp(page);
    await load(page, "/en");
    const html = page.locator("html");
    const before = await html.getAttribute("data-theme");
    await page.getByRole("button", { name: /theme/i }).click();
    await expect(html).not.toHaveAttribute("data-theme", before ?? "");
    await load(page, "/en/work?f=ai");
    await page.getByRole("link", { name: /^Mobile/ }).click();
    await expect(page).toHaveURL(/f=mobile/);
    await page.getByRole("link", { name: /^All/ }).click();
    await page.locator('main a[href="/en/work/geotrack"]').first().click();
    await expect(page).toHaveURL(/\/en\/work\/geotrack$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await check();
  });

  test("karaoke video plays, pauses and resumes: no CSP violation", async ({ page }) => {
    const check = await watchCsp(page);
    await load(page, "/en/work/karaoke-sync");
    const video = page.locator("main video[data-video-cover]");
    await expect(video).toHaveCount(1);
    await page.getByRole("button", { name: "Pause video" }).click();
    await expect(video).toHaveAttribute("data-paused", "");
    await page.getByRole("button", { name: "Play video" }).click();
    await expect(video).not.toHaveAttribute("data-paused", "");
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(2);
    await check();
  });

  test("contact form submission (dry run): no CSP violation", async ({ page }) => {
    const check = await watchCsp(page);
    await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `10.${[0, 0, 0].map(() => 1 + Math.floor(Math.random() * 254)).join(".")}` });
    await load(page, "/en/contact");
    await page.getByLabel("Name", { exact: true }).fill("Ada Lovelace");
    await page.getByLabel("E-mail", { exact: true }).fill("ada@example.com");
    await page.getByLabel("Message", { exact: true }).fill("I would like to talk about a project.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator('[data-contact-status="success"]')).toBeVisible();
    await check();
  });
});
