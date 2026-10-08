import { test, expect } from "@playwright/test";

test.describe("/services", () => {
  test("has four cards linking to cases", async ({ page }) => {
    await page.goto("/en/services");
    await expect(page.getByRole("heading", { level: 1, name: "Services" })).toBeVisible();
    const cards = page.locator("main article");
    await expect(cards).toHaveCount(4);
    const link = cards.first().getByRole("link");
    await expect(link).toHaveAttribute("href", "/en/work/geotrack");
    await expect(link).toHaveAccessibleName(/See a case: /);
    await expect(page.getByRole("link", { name: "Start a project" })).toHaveAttribute("href", "/en/contact");
  });
  test("tr is localized", async ({ page }) => {
    await page.goto("/tr/services");
    await expect(page.getByRole("heading", { level: 1, name: "Hizmetler" })).toBeVisible();
    await expect(page.locator("main article").first().getByRole("link")).toHaveAttribute("href", "/tr/work/geotrack");
  });
});

test.describe("/colophon", () => {
  test("renders heading, lists and repo link", async ({ page }) => {
    await page.goto("/en/colophon");
    await expect(page.getByRole("heading", { level: 1, name: "Colophon" })).toBeVisible();
    await expect(page.locator("main ol li")).toHaveCount(4);
    const repo = page.getByRole("link", { name: /GitHub|repo|source/i }).first();
    await expect(page.locator('main a[href="https://github.com/emindundar/portfolio"]')).toHaveAttribute("rel", "noreferrer noopener");
    await expect(repo).toBeVisible();
  });
});

test.describe("nav", () => {
  const primary = (page: import("@playwright/test").Page) => page.getByRole("navigation", { name: /primary|ana gezinme/i });

  test("active link carries aria-current", async ({ page }) => {
    await page.goto("/en/work");
    await expect(primary(page).getByRole("link", { name: "Work" })).toHaveAttribute("aria-current", "page");
    await page.goto("/en/work/geotrack");
    await expect(primary(page).getByRole("link", { name: "Work" })).toHaveAttribute("aria-current", "page");
    await page.goto("/en");
    await expect(primary(page).locator("[aria-current=page]")).toHaveCount(1);
    await expect(primary(page).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  });

  test("links are at least 44px tall", async ({ page }) => {
    await page.goto("/en");
    const links = primary(page).getByRole("link");
    await expect(links).toHaveCount(5);
    for (const l of await links.all()) expect((await l.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  test("tr labels", async ({ page }) => {
    await page.goto("/tr");
    const nav = primary(page);
    for (const name of ["Ana sayfa", "İşler", "Hakkımda", "Hizmetler", "İletişim"]) {
      await expect(nav.getByRole("link", { name })).toBeVisible();
    }
  });

  test("no horizontal page overflow at 360px; toggles stay tappable", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/en");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.getByRole("button", { name: /theme/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", /.+/);
  });

  test("footer links", async ({ page }) => {
    await page.goto("/en");
    const nav = page.getByRole("navigation", { name: "Footer" });
    await expect(nav.getByRole("link", { name: "Colophon" })).toHaveAttribute("href", "/en/colophon");
    await expect(nav.getByRole("link", { name: /GitHub/ })).toHaveAttribute("target", "_blank");
    for (const l of await nav.getByRole("link").all()) expect((await l.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});
