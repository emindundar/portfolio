import { test, expect, type Page } from "@playwright/test";

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  return errors;
}

test.describe("hero shader", () => {
  test("renders a canvas when motion and WebGL are available", async ({ page }) => {
    const errors = collectErrors(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en");
    const canvas = page.locator("[data-shader='ready'] canvas");
    await expect(canvas).toHaveCount(1);
    await expect(canvas).toHaveAttribute("aria-hidden", "true");
    // Poster yalnızca ilk kare çizildikten sonra kalkar
    await expect(page.locator("[data-hero-poster]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("pauses the render loop offscreen and resumes when scrolled back", async ({ page, isMobile }) => {
    test.skip(isMobile, "visibility gating is viewport-independent; run on desktop");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en");
    const host = page.locator("[data-shader='ready']");
    await expect(host).toHaveCount(1);
    await expect(host).toHaveAttribute("data-running", "1");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(host).toHaveAttribute("data-running", "0");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(host).toHaveAttribute("data-running", "1");
  });

  test("renders the poster under reduced motion", async ({ page }) => {
    const errors = collectErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    // İstemci hydrate oldu ve hareket kararını verdi
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    // Yükleyici karar verdi: kalıcı poster ("pending"/"loading" değil)
    await expect(page.locator("[data-hero-poster='static']")).toHaveCount(1);
    await expect.poll(async () => page.locator("canvas").count(), { timeout: 1500 }).toBe(0);
    await expect(page.locator("[data-hero-poster]")).toHaveCount(1);
    await expect(page.locator("[data-shader]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("renders the poster when WebGL is unavailable", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      const w = window as unknown as { __glProbed?: boolean };
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === "webgl" || type === "webgl2") {
          w.__glProbed = true;
          return null;
        }
        return (orig as (this: HTMLCanvasElement, t: string, ...r: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    const errors = collectErrors(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en");
    // Yükleyici WebGL'i gerçekten sorguladı → karar verildi
    await page.waitForFunction(() => (window as unknown as { __glProbed?: boolean }).__glProbed === true);
    await expect(page.locator("[data-hero-poster='static']")).toHaveCount(1);
    await expect(page.locator("[data-hero-poster]")).toHaveCount(1);
    await expect(page.locator("[data-shader]")).toHaveCount(0);
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(errors).toEqual([]);
    await ctx.close();
  });
});
