import { test, expect, type Page } from "@playwright/test";

// Counts follow content/projects/*.meta.json: 7 projects; mobile 5 (geotrack, kipgoz, gymai, bio-astral, notifyx),
// ai 2 (gymai, cursor-notion-mcp), web 1 (karaoke-sync).
const items = (page: Page) => page.locator("[data-work-item]");
const slugs = (page: Page) => items(page).evaluateAll((els) => els.map((e) => e.getAttribute("data-flip-id")));
const dimmed = (page: Page) =>
  items(page).evaluateAll((els) => els.filter((e) => Number(getComputedStyle(e).opacity) < 1).length);

test.describe("/work", () => {
  test("lists all seven projects with numbered rows", async ({ page }) => {
    await page.goto("/en/work");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Work");
    await expect(items(page)).toHaveCount(7);
    await expect(items(page).first()).toContainText("01");
    await expect(items(page).last()).toContainText("07");
    await expect(page.getByRole("navigation", { name: "Filter by capability" }).getByRole("link")).toHaveCount(6);
    await expect(page.getByRole("link", { name: /^All/ })).toHaveAttribute("aria-current", "page");
  });

  test("URL filter narrows the list server-side (no JS needed)", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/en/work?f=ai");
    await expect(items(page)).toHaveCount(2);
    expect(await slugs(page)).toEqual(["gymai", "cursor-notion-mcp"]);
    // Visible, not just present: the streamed list is revealed by the <noscript> rule in the page.
    await expect(items(page).first()).toBeVisible();
    await expect(page.locator("[data-work-pending]")).toBeHidden();
    const listBottom = (await page.locator("[data-work-list]").boundingBox())!;
    const footerTop = (await page.locator("body > footer").boundingBox())!;
    expect(listBottom.y + listBottom.height).toBeLessThanOrEqual(footerTop.y);
    await expect(page.getByRole("link", { name: /^AI/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: /^All/ })).not.toHaveAttribute("aria-current", "page");
    await ctx.close();
  });

  test("chip click updates URL and list; browser back restores", async ({ page }) => {
    await page.goto("/en/work");
    await expect(page.locator("html")).toHaveAttribute("data-motion", /./);
    await page.getByRole("link", { name: /^Mobile/ }).click();
    await expect(page).toHaveURL(/\/en\/work\?f=mobile$/);
    await expect(items(page)).toHaveCount(5);
    await page.goBack();
    await expect(page).toHaveURL(/\/en\/work$/);
    await expect(items(page)).toHaveCount(7);
  });

  test("after a filter change the list settles: ready signal set, every row fully visible and untransformed", async ({ page }) => {
    await page.goto("/en/work");
    await expect(page.locator("html")).toHaveAttribute("data-motion", /./);
    const list = page.locator("[data-work-list]");
    await expect(list).toHaveAttribute("data-work-ready", "all");

    await page.getByRole("link", { name: /^AI/ }).click();
    await expect(list).toHaveAttribute("data-work-ready", "ai");
    expect(await slugs(page)).toEqual(["gymai", "cursor-notion-mcp"]);
    expect(await dimmed(page)).toBe(0);

    // Back to all: five rows re-enter (the fade-in path).
    await page.getByRole("link", { name: /^All/ }).click();
    await expect(list).toHaveAttribute("data-work-ready", "all");
    await expect(items(page)).toHaveCount(7);
    expect(await dimmed(page)).toBe(0);
    const transformed = await items(page).evaluateAll(
      (els) => els.filter((e) => getComputedStyle(e).transform !== "none" || (e as HTMLElement).style.position !== "").length,
    );
    expect(transformed).toBe(0);
  });

  test("unknown facet falls back to all", async ({ page }) => {
    await page.goto("/en/work?f=blockchain");
    await expect(items(page)).toHaveCount(7);
    await expect(page.getByRole("link", { name: /^All/ })).toHaveAttribute("aria-current", "page");
  });

  test("row is one link to the case page", async ({ page }) => {
    await page.goto("/en/work");
    const links = items(page).first().getByRole("link");
    await expect(links).toHaveCount(1);
    await expect(links).toHaveAttribute("href", /\/en\/work\/geotrack$/);
  });

  test("canonical ignores the filter; tr is localized", async ({ page }) => {
    await page.goto("/tr/work?f=web");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/tr\/work$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("İşler");
    await expect(items(page)).toHaveCount(1);
    await expect(page.getByRole("link", { name: /^Web/ })).toHaveAttribute("aria-current", "page");
  });

  test("keyboard: Enter on a focused chip filters and the list settles", async ({ page }) => {
    await page.goto("/en/work");
    await expect(page.locator("html")).toHaveAttribute("data-motion", /./);
    const list = page.locator("[data-work-list]");
    await expect(list).toHaveAttribute("data-work-ready", "all");
    const chip = page.getByRole("link", { name: /^Backend/ });
    await chip.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/en\/work\?f=backend$/);
    await expect(list).toHaveAttribute("data-work-ready", "backend");
    await expect(items(page)).toHaveCount(5);
    await expect(chip).toHaveAttribute("aria-current", "page");
    expect(await dimmed(page)).toBe(0);
  });

  test("clicking the active chip or a quick second chip never leaves the list unsettled", async ({ page }) => {
    await page.goto("/en/work");
    await expect(page.locator("html")).toHaveAttribute("data-motion", /./);
    const list = page.locator("[data-work-list]");
    await expect(list).toHaveAttribute("data-work-ready", "all");
    await page.getByRole("link", { name: /^All/ }).click(); // already current: no capture, stays ready
    await expect(list).toHaveAttribute("data-work-ready", "all");
    await page.getByRole("link", { name: /^Mobile/ }).click();
    await page.getByRole("link", { name: /^AI/ }).click(); // interrupts the first Flip
    await expect(list).toHaveAttribute("data-work-ready", "ai");
    await expect(items(page)).toHaveCount(2);
    expect(await dimmed(page)).toBe(0);
  });

  test("rows expose their title as a heading inside the link", async ({ page }) => {
    await page.goto("/en/work");
    await expect(items(page).first().getByRole("link").getByRole("heading", { level: 2 })).toContainText("GeoTrack");
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(7);
  });

  test("reduced motion: items visible, list ready", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en/work");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    expect(await dimmed(page)).toBe(0);
    await page.getByRole("link", { name: /^Mobile/ }).click();
    await expect(page.locator("[data-work-list]")).toHaveAttribute("data-work-ready", "mobile");
    await expect(items(page)).toHaveCount(5);
    expect(await dimmed(page)).toBe(0);
  });
});
