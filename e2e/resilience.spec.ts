import { test, expect, type Browser, type Page } from "@playwright/test";

// Motion is an enhancement: if a lazy motion/WebGL chunk fails to load (flaky network, stale deploy),
// the page must keep its static content and never fall into an error screen.
// Chunk file names are content hashes, so the failing chunk is located by its body, not its name.

const HEADLINE = "I build products end to end.";

/** Script URLs that are not in the server HTML, i.e. chunks loaded lazily after hydration. */
async function lazyChunks(browser: Browser): Promise<string[]> {
  const ctx = await browser.newContext({ reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  const requested = new Set<string>();
  page.on("request", (req) => {
    if (req.resourceType() === "script") requested.add(req.url());
  });
  const html = await (await page.request.get("/en")).text();
  await page.goto("/en");
  // Everything lazy has arrived: the split headline (GSAP), Lenis and the shader's first frame.
  await expect(page.locator("h1")).toHaveAttribute("aria-label", HEADLINE);
  await expect(page.locator("html")).toHaveClass(/\blenis\b/);
  await page.waitForLoadState("networkidle");
  await ctx.close();
  return [...requested].filter((url) => !html.includes(new URL(url).pathname));
}

async function chunksContaining(browser: Browser, marker: string): Promise<string[]> {
  const ctx = await browser.newContext();
  const out: string[] = [];
  for (const url of await lazyChunks(browser)) {
    if ((await (await ctx.request.get(url)).text()).includes(marker)) out.push(url);
  }
  await ctx.close();
  expect(out.length, `a lazy chunk containing "${marker}"`).toBeGreaterThan(0);
  return out;
}

/** Opens /en with the given chunks aborted; resolves after every aborted request has failed and the network settled. */
async function openWithout(browser: Browser, urls: string[]) {
  const ctx = await browser.newContext({ reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const failed = new Set<string>();
  page.on("requestfailed", (req) => {
    if (urls.includes(req.url())) failed.add(req.url());
  });
  await page.route("**/*.js", (route) => (urls.includes(route.request().url()) ? route.abort() : route.continue()));
  await page.goto("/en");
  await expect.poll(() => failed.size).toBeGreaterThan(0);
  await page.waitForLoadState("networkidle");
  return { ctx, page, errors };
}

async function expectStaticHome(page: Page, errors: string[]) {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(HEADLINE);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("#__next_error__")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /explore work/i })).toBeVisible();
  expect(errors).toEqual([]);
}

test.describe("motion chunk failure", () => {
  test.skip(({ isMobile }) => isMobile, "chunk graph is identical on mobile; run once");

  test("GSAP chunk fails: the static page stays, no error screen", async ({ browser }) => {
    const gsap = await chunksContaining(browser, "registerPlugin");
    const { ctx, page, errors } = await openWithout(browser, gsap);
    await expectStaticHome(page, errors);
    // No split happened: the headline is still a plain text node.
    await expect(page.locator("h1")).not.toHaveAttribute("aria-label", /.+/);
    await ctx.close();
  });

  test("Lenis chunk fails: native scroll still works, no error screen", async ({ browser }) => {
    const lenis = await chunksContaining(browser, "lenis");
    const { ctx, page, errors } = await openWithout(browser, lenis);
    await expectStaticHome(page, errors);
    await expect(page.locator("html")).not.toHaveClass(/\blenis\b/);
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, 800);
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 3000 }).toBeGreaterThan(100);
    await ctx.close();
  });

  test("hero shader chunk fails: the poster stays as the static fallback", async ({ browser }) => {
    const shader = await chunksContaining(browser, "uAccent");
    const { ctx, page, errors } = await openWithout(browser, shader);
    await expectStaticHome(page, errors);
    await expect(page.locator("[data-hero-poster='static']")).toHaveCount(1);
    await expect(page.locator("canvas")).toHaveCount(0);
    await ctx.close();
  });
});
