import { test, expect } from "@playwright/test";

for (const [locale, heading] of [["en", "Now"], ["tr", "Şu an"]] as const) {
  test(`${locale}: now panel shows the manual line and a dated update`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const panel = page.locator("[data-now]");
    await expect(panel.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    await expect(panel.locator("p").first()).not.toBeEmpty();
    await expect(panel.locator("time").first()).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);
  });
}

test("live row, when GitHub answered at build time, links to a github.com repo with a date", async ({ page }) => {
  await page.goto("/en");
  const live = page.locator("[data-now-live]");
  // Built without network (or rate-limited): the row is absent by design; unit tests cover both branches.
  test.skip((await live.count()) === 0, "GitHub was unreachable when this build ran");
  await expect(live.getByRole("link")).toHaveAttribute("href", /^https:\/\/github\.com\/emindundar\//);
  await expect(live.locator("time")).toHaveAttribute("datetime", /^\d{4}-\d{2}-\d{2}$/);
});

test("the panel does not push the hero headline out of the first mobile viewport", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "mobile layout check");
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
});
