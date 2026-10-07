import { test, expect } from "@playwright/test";

test("home lists projects from the content pipeline in both locales", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByTestId("project")).toHaveCount(1);
  await expect(page.getByTestId("project").first()).toContainText("GeoTrack");
  await expect(page.getByTestId("project").first()).toContainText("MOBILE · BACKEND");

  await page.goto("/tr");
  await expect(page.getByTestId("project").first()).toContainText("Gerçek Zamanlı");
});
