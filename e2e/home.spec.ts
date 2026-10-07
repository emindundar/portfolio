import { test, expect } from "@playwright/test";

test.describe("home page", () => {
  test("hero headline is in the server HTML and accessible", async ({ page }) => {
    const res = await page.request.get("/en");
    const html = await res.text();
    expect(html).toContain("I build products end to end.");
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("I build products end to end.");
  });

  test("capabilities grid shows five facets with counts", async ({ page }) => {
    await page.goto("/en");
    const cells = page.getByTestId("capability");
    await expect(cells).toHaveCount(5);
    await expect(cells.first()).toContainText("Mobile");
    await expect(cells.first()).toContainText("1 project");
    await expect(cells.first()).toHaveAttribute("href", /\/en\/work\?f=mobile$/);
  });

  test("featured list links to the project page", async ({ page }) => {
    await page.goto("/en");
    const first = page.getByTestId("project").first();
    await expect(first).toContainText("GeoTrack");
    await expect(first.getByRole("link")).toHaveAttribute("href", /\/en\/work\/geotrack$/);
  });

  test("reduced motion: every revealed element is fully visible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    // The client has hydrated and decided; reveal impls never mount under reduced motion.
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await expect(page.locator("[data-reveal]").first()).toBeAttached();
    expect(await page.locator("[data-reveal]").count()).toBeGreaterThan(0);
    const hidden = await page.locator("[data-reveal]").evaluateAll((els) =>
      els.filter((el) => Number(getComputedStyle(el).opacity) < 1).length,
    );
    expect(hidden).toBe(0);
  });

  test("motion: below-fold reveal items start hidden and reveal on scroll", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
    const item = page.locator("section:last-of-type [data-reveal]").first();
    const opacity = () => item.evaluate((el) => getComputedStyle(el).opacity);
    await expect.poll(opacity).toBe("0");
    await item.scrollIntoViewIfNeeded();
    await expect.poll(opacity, { timeout: 3000 }).toBe("1");
  });

  test("keyboard: Tab reaches the hero CTA with the accent focus ring", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard on desktop");
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("data-motion", /reduced|full/);
    const cta = page.getByRole("link", { name: /explore work/i });
    const isFocused = () => cta.evaluate((el) => el === document.activeElement);
    for (let i = 0; i < 20 && !(await isFocused()); i++) await page.keyboard.press("Tab");
    await expect(cta).toBeFocused();
    // Justified sleep: the button's transition-colors also animates outline-color (200 ms); read it once settled.
    await page.waitForTimeout(250);
    const ring = await cta.evaluate((el) => {
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      const probe = document.createElement("span");
      probe.style.color = accent;
      document.body.appendChild(probe);
      const accentRgb = getComputedStyle(probe).color;
      probe.remove();
      const cs = getComputedStyle(el);
      return { width: cs.outlineWidth, style: cs.outlineStyle, color: cs.outlineColor, accentRgb };
    });
    expect(ring.style).toBe("solid");
    expect(ring.width).toBe("2px");
    expect(ring.color).toBe(ring.accentRgb);
  });

  test("turkish home renders translated sections", async ({ page }) => {
    await page.goto("/tr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Ürünü uçtan uca kurarım.");
    await expect(page.getByText("Yetkinlikler")).toBeVisible();
  });
});
