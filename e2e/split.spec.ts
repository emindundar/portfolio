import { test, expect } from "@playwright/test";

const HEADLINE = "I build products end to end.";

test.describe("SplitReveal hero headline", () => {
  test("motion allowed: h1 is split into masked, aria-hidden lines with a full aria-label", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en");
    const h1 = page.locator("h1");
    await expect(h1).toHaveAttribute("aria-label", HEADLINE);
    await expect(h1.locator('[aria-hidden="true"]').first()).toBeAttached();
    await expect(page.getByRole("heading", { level: 1, name: HEADLINE })).toBeVisible();
  });

  test("reduced motion: h1 stays a plain text node", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    await page.getByRole("button", { name: /theme/i }).waitFor();
    const h1 = page.locator("h1");
    await expect(h1).toHaveText(HEADLINE);
    await expect(h1.locator('[aria-hidden="true"]')).toHaveCount(0);
    await expect(h1).not.toHaveAttribute("aria-label", /.+/);
  });
});
