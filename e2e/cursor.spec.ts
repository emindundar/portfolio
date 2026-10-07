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
    await page.getByRole("button", { name: /theme/i }).waitFor();
    await expect.poll(async () => page.locator("[data-cursor-root]").count(), { timeout: 1500 }).toBe(0);
    await expect
      .poll(async () => page.locator("body").getAttribute("data-cursor"), { timeout: 1500 })
      .toBeNull();
  });

  test("reduced motion: no custom cursor on desktop", async ({ page, isMobile }) => {
    test.skip(isMobile, "fine pointer only");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    await page.getByRole("button", { name: /theme/i }).waitFor();
    await expect.poll(async () => page.locator("[data-cursor-root]").count(), { timeout: 1500 }).toBe(0);
    await expect
      .poll(async () => page.locator("body").getAttribute("data-cursor"), { timeout: 1500 })
      .toBeNull();
  });
});
