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
    const { baseURL } = test.info().project.use;
    await context.addCookies([{ name: "theme", value: "evil", url: baseURL! }]);
    await page.goto("/en");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  });

  test("invalid cookie falls back to system light", async ({ context, page }) => {
    const { baseURL } = test.info().project.use;
    await page.emulateMedia({ colorScheme: "light" });
    await context.addCookies([{ name: "theme", value: "evil", url: baseURL! }]);
    await page.goto("/en");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
    const bg = await page.locator("html").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe("rgb(244, 242, 238)");
  });

  test("no rounded corners on the nav links", async ({ page }) => {
    await page.goto("/en");
    const radius = await page.locator("header a").first().evaluate((el) => getComputedStyle(el).borderRadius);
    expect(radius).toBe("0px");
  });
});
