import AxeBuilder from "@axe-core/playwright";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const THEMES = ["dark", "light"] as const;

// Every page type, both locales between them. `/en/does-not-exist` is the localized 404 (site chrome);
// `/static/missing.png` is the bilingual global 404 (no locale, no MotionProvider, so no data-motion to wait on).
const PAGES = [
  "/en",
  "/tr",
  "/en/work",
  "/en/work/geotrack",
  "/tr/work/karaoke-sync",
  "/en/about",
  "/tr/services",
  "/en/colophon",
  "/tr/contact",
  "/en/does-not-exist",
  "/static/missing.png",
];

/** ThemeScript reads the `theme` cookie (lib/theme.ts THEME_COOKIE, values dark|light) and sets <html data-theme> before paint. */
async function setTheme(context: BrowserContext, baseURL: string, theme: (typeof THEMES)[number]) {
  await context.addCookies([{ name: "theme", value: theme, url: baseURL }]);
}

async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(" ")) }));
}

for (const theme of THEMES) {
  for (const path of PAGES) {
    test(`${path} has no WCAG A/AA violations (${theme})`, async ({ page, context, baseURL }) => {
      await setTheme(context, baseURL!, theme);
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      if (!path.startsWith("/static/")) await expect(page.locator("html")).toHaveAttribute("data-motion", /reduced|full/);
      expect(await violations(page)).toEqual([]);
    });
  }

  test(`contact form in its error state has no violations (${theme})`, async ({ page, context, baseURL }) => {
    await setTheme(context, baseURL!, theme);
    // Own address per test: the server's in-memory rate limiter is shared by every test.
    await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.${[0, 0, 0].map(() => 1 + Math.floor(Math.random() * 254)).join(".")}` });
    await page.goto("/en/contact");
    await expect(page.locator("html")).toHaveAttribute("data-motion", /reduced|full/);
    await page.getByLabel("E-mail", { exact: true }).fill("nope");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator('[data-contact-status="error"]')).toBeVisible();
    await expect(page.getByLabel("E-mail", { exact: true })).toHaveAttribute("aria-invalid", "true");
    expect(await violations(page)).toEqual([]);
  });
}

test("keyboard: every focusable element on the home page shows a focus indicator", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "hardware keyboard flow");
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("data-motion", /reduced|full/);
  let visited = 0;
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate((n) => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      // Tag each element on its first visit: a second visit means focus wrapped around (outerHTML prefixes collide).
      const first = el.dataset.a11yTab === undefined;
      if (first) el.dataset.a11yTab = String(n);
      const s = getComputedStyle(el);
      return { first, key: el.outerHTML.slice(0, 120), outline: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2 };
    }, i);
    if (!focused || !focused.first) break;
    visited++;
    expect(focused.outline, focused.key).toBe(true);
  }
  expect(visited).toBeGreaterThan(8);
});
