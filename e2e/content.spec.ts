import { test, expect } from "@playwright/test";

test("home lists projects from the content pipeline in both locales", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByTestId("project")).toHaveCount(4);
  await expect(page.getByTestId("project").first()).toContainText("GeoTrack");
  await expect(page.getByTestId("project").first()).toContainText("Mobile · Backend");

  await page.goto("/tr");
  await expect(page.getByTestId("project").first()).toContainText("Saha Rotalama");
});
