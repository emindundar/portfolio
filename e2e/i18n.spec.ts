import { test, expect, type Browser } from "@playwright/test";

// Playwright's default context locale (en-US) overrides an Accept-Language set via
// extraHTTPHeaders on document requests, so override the header at the route level instead.
async function newPageWithAcceptLanguage(browser: Browser, value: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.route("**/", (route) =>
    route.continue({ headers: { ...route.request().headers(), "accept-language": value } }),
  );
  return { ctx, page };
}

test.describe("locale routing", () => {
  test("root redirects to /tr for Turkish Accept-Language", async ({ browser }) => {
    const { ctx, page } = await newPageWithAcceptLanguage(browser, "tr-TR,tr;q=0.9");
    await page.goto("/");
    await expect(page).toHaveURL(/\/tr$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
    await ctx.close();
  });

  test("root redirects to /en for wildcard Accept-Language", async ({ browser }) => {
    const { ctx, page } = await newPageWithAcceptLanguage(browser, "*");
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await ctx.close();
  });

  test("root redirects to /en when Accept-Language is absent", async ({ browser }) => {
    const { ctx, page } = await newPageWithAcceptLanguage(browser, "");
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await ctx.close();
  });

  test("hreflang alternates are present", async ({ page }) => {
    await page.goto("/en");
    const links = page.locator('link[rel="alternate"][hreflang]');
    await expect(links).toHaveCount(3);
    await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute("href", /\/en$/);
  });

  test("unknown locale shows localized 404", async ({ page }) => {
    const res = await page.goto("/fr");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/not found/i);
  });

  test("unknown path under a locale shows 404 in that locale", async ({ page }) => {
    const res = await page.goto("/tr/boyle-bir-sayfa-yok");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Sayfa bulunamadı");
  });

  test("language toggle switches locale and keeps path", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("link", { name: "[tr]" }).click();
    await expect(page).toHaveURL(/\/tr$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ürünü uçtan uca");
  });
});
