import { test, expect } from "@playwright/test";

test.describe("/about", () => {
  test("renders hero and timeline", async ({ page }) => {
    await page.goto("/en/about");
    await page.waitForSelector("html[data-motion]");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("main")).toHaveCount(1);
    const main = page.locator("main");
    await expect(main).toContainText("Feedback Yem");
    await expect(main).toContainText("Pamukkale");
    await expect(main).toContainText("Feb 2026 — Present");
  });

  test("tr page is localized", async ({ page }) => {
    await page.goto("/tr/about");
    await expect(page.getByRole("heading", { level: 2, name: "Nasıl çalışırım" })).toBeVisible();
    await expect(page.locator("main")).toContainText("Pamukkale Üniversitesi");
    await expect(page.locator("main")).toContainText("Şub 2026 — Devam");
  });

  test("events strip has three figures with photo and coordinates", async ({ page }) => {
    await page.goto("/en/about");
    const figures = page.locator("main figure");
    await expect(figures).toHaveCount(3);
    await expect(figures.first().locator("img")).toHaveAttribute("src", /\/media\/events\//);
    await expect(figures.first().locator("img")).toHaveAttribute("alt", /DevFest/);
    await expect(figures.first().locator("figcaption")).toContainText("38.4514°N");
  });

  test("CV links download and /cv redirects per locale", async ({ page }) => {
    await page.goto("/en/about");
    const links = page.locator("a[download]");
    await expect(links).toHaveCount(2);
    await expect(links.first()).toHaveAttribute("href", "/cv/Emin_Dundar_CV_en.pdf");
    await expect(links.nth(1)).toHaveAttribute("href", "/cv/Emin_Dundar_CV_tr.pdf");

    const redirect = await page.request.get("/en/cv", { maxRedirects: 0 });
    expect(redirect.status()).toBe(302);
    expect(redirect.headers()["location"]).toMatch(/\/cv\/Emin_Dundar_CV_en\.pdf$/);
    const tr = await page.request.get("/tr/cv", { maxRedirects: 0 });
    expect(tr.status()).toBe(302);
    expect(tr.headers()["location"]).toBe("/cv/Emin_Dundar_CV_tr.pdf");

    const pdf = await page.request.get("/cv/Emin_Dundar_CV_en.pdf");
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
  });
});
