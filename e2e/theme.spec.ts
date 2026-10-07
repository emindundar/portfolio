import { test, expect } from "@playwright/test";

test.describe("theme", () => {
  test("toggle sets data-theme and persists across reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/en");
    await page.getByRole("button", { name: /theme/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("invalid theme cookie is ignored", async ({ context, page }) => {
    await context.addCookies([{ name: "theme", value: "evil", url: "http://localhost:3000" }]);
    await page.goto("/en");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  });

  test("no rounded corners on the nav links", async ({ page }) => {
    await page.goto("/en");
    const radius = await page.locator("header a").first().evaluate((el) => getComputedStyle(el).borderRadius);
    expect(radius).toBe("0px");
  });
});
