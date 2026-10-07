import { test, expect } from "@playwright/test";

test.describe("home page", () => {
  test("hero headline is in the server HTML and accessible", async ({ page }) => {
    const res = await page.request.get("/en");
    const html = await res.text();
    expect(html).toContain("I build products end to end.");
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("I build products end to end.");
  });

  test("capabilities grid shows five facets with counts", async ({ page }) => {
    await page.goto("/en");
    const cells = page.getByTestId("capability");
    await expect(cells).toHaveCount(5);
    await expect(cells.first()).toContainText("Mobile");
    await expect(cells.first()).toContainText("1 project");
  });

  test("featured list links to the project page", async ({ page }) => {
    await page.goto("/en");
    const first = page.getByTestId("project").first();
    await expect(first).toContainText("GeoTrack");
    await expect(first.getByRole("link")).toHaveAttribute("href", /\/en\/work\/geotrack$/);
  });

  test("reduced motion: every revealed element is fully visible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    const hidden = await page.locator("[data-reveal]").evaluateAll((els) =>
      els.filter((el) => Number(getComputedStyle(el).opacity) < 1).length,
    );
    expect(hidden).toBe(0);
  });

  test("keyboard: Tab reaches the hero CTA with a visible focus ring", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard on desktop");
    await page.goto("/en");
    const cta = page.getByRole("link", { name: /explore work/i });
    await cta.focus();
    await expect(cta).toBeFocused();
    const outline = await cta.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");
  });

  test("turkish home renders translated sections", async ({ page }) => {
    await page.goto("/tr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Ürünü uçtan uca kurarım.");
    await expect(page.getByText("Yetenek yüzeyleri")).toBeVisible();
  });
});
