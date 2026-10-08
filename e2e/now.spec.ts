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

test("on mobile the panel starts at or below the bottom of the hero headline", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "mobile layout check");
  await page.goto("/en");
  // Wait for the motion decision so a headline split/reveal cannot move the boxes mid-measurement.
  await expect(page.locator("html")).toHaveAttribute("data-motion", /reduced|full/);
  const h1 = await page.getByRole("heading", { level: 1 }).boundingBox();
  const panel = await page.locator("[data-now]").boundingBox();
  expect(h1).not.toBeNull();
  expect(panel).not.toBeNull();
  expect(panel!.y).toBeGreaterThanOrEqual(h1!.y + h1!.height);
});
