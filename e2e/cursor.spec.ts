import { test, expect } from "@playwright/test";

test.describe("custom cursor", () => {
  test("desktop with motion: cursor root exists and body opts out of native cursor", async ({ page, isMobile }) => {
    test.skip(isMobile, "fine pointer only");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en");
    await expect(page.locator("[data-cursor-root]")).toHaveCount(1);
    await expect(page.locator("body")).toHaveAttribute("data-cursor", "custom");
  });

  test("mobile (coarse pointer): no custom cursor", async ({ page, isMobile }) => {
    test.skip(!isMobile, "coarse pointer only");
    await page.goto("/en");
    // Cursor mounted and decided against the custom cursor.
    await expect(page.locator("body")).toHaveAttribute("data-cursor", "native");
    await expect(page.locator("[data-cursor-root]")).toHaveCount(0);
  });

  test("mobile: hero CTA is not magnetized and navigates on tap", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch only");
    await page.goto("/en");
    await expect(page.locator("body")).toHaveAttribute("data-cursor", "native");
    const cta = page.getByRole("link", { name: /explore work/i });
    expect(await cta.evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    await cta.tap();
    await expect(page).toHaveURL(/\/en\/work$/);
  });

  test("reduced motion: no custom cursor on desktop", async ({ page, isMobile }) => {
    test.skip(isMobile, "fine pointer only");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    // Decided: under reduced motion the Cursor chunk is never loaded, so nothing can opt out of the native cursor.
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await expect(page.locator("[data-cursor-root]")).toHaveCount(0);
    await expect(page.locator("body")).not.toHaveAttribute("data-cursor", "custom");
  });
});
