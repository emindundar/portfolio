import { test, expect } from "@playwright/test";

test.describe("motion foundation", () => {
  test("lenis is active on html when motion is allowed", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en");
    await expect(page.locator("html")).toHaveClass(/lenis/);
  });

  test("lenis is absent under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
  });

  test("wheel scroll moves the page (no scroll-jacking lockup)", async ({ page }) => {
    test.skip(true, "page too short until Task 5");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en");
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, 800);
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 3000 }).toBeGreaterThan(100);
  });
});
