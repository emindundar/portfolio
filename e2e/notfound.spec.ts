import { test, expect } from "@playwright/test";
import en from "../messages/en.json";
import tr from "../messages/tr.json";

// The heading must be rendered markup, not just a string inside the RSC payload (the old client-rendered 404 shipped
// `<html id="__next_error__">` with the translations only in `self.__next_f`, so a plain `toContain` passed).
const renderedHeading = (text: string) => new RegExp(`<h1[^>]*>${text}</h1>`);

const CASES = [
  { url: "/en/xyz", lang: "en", heading: en.NotFound.title, home: "/en" },
  { url: "/tr/xyz", lang: "tr", heading: tr.NotFound.title, home: "/tr" },
  { url: "/en/work/unknown-slug", lang: "en", heading: en.NotFound.title, home: "/en" },
  { url: "/tr/work/unknown-slug", lang: "tr", heading: tr.NotFound.title, home: "/tr" },
];

for (const c of CASES) {
  test(`${c.url}: real 404, server-rendered in ${c.lang}, with a way home`, async ({ page, request }) => {
    const res = await request.get(c.url);
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(html).toMatch(renderedHeading(c.heading)); // present without JavaScript
    expect(html).toMatch(new RegExp(`<html[^>]*lang="${c.lang}"`));
    expect(html).toMatch(/<meta name="robots" content="noindex/);
    await page.goto(c.url);
    await expect(page.getByRole("heading", { level: 1, name: c.heading })).toBeVisible();
    const back = page.getByRole("main").getByRole("link").first();
    await expect(back).toHaveAttribute("href", c.home);
    expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole("navigation").first()).toBeVisible(); // site chrome is kept
  });
}

test("a path without a locale is redirected and gets the English 404", async ({ request }) => {
  const res = await request.get("/xyz", { headers: { "accept-language": "en" } });
  expect(res.url()).toMatch(/\/en\/xyz$/);
  expect(res.status()).toBe(404);
  expect(await res.text()).toMatch(renderedHeading(en.NotFound.title));
});

test("a path no route matches gets the bilingual page with a 404 status", async ({ page, request }) => {
  const res = await request.get("/static/missing.png");
  expect(res.status()).toBe(404);
  const html = await res.text();
  expect(html).toMatch(renderedHeading(en.NotFound.title));
  expect(html).toMatch(/<meta name="robots" content="noindex/);
  await page.goto("/static/missing.png");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.NotFound.title);
  await expect(page.locator('[lang="tr"]')).toContainText(tr.NotFound.title);
  const home = page.getByRole("link", { name: en.NotFound.backHome });
  const anaSayfa = page.getByRole("link", { name: tr.NotFound.backHome });
  await expect(home).toHaveAttribute("href", "/en");
  await expect(anaSayfa).toHaveAttribute("href", "/tr");
  for (const link of [home, anaSayfa]) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test("a one-segment file path (no locale, proxy skipped) is a server-rendered 404, not the locale layout", async ({
  request,
}) => {
  // `/apple-touch-icon.png` would match `[locale]`; `unstable_paramMatching` closes that param, so the global page
  // answers instead of the layout throwing notFound() into a client-rendered error shell.
  const res = await request.get("/apple-touch-icon.png");
  expect(res.status()).toBe(404);
  const html = await res.text();
  expect(html).toMatch(renderedHeading(en.NotFound.title));
  expect(html).not.toContain("__next_error__");
});

for (const scheme of ["light", "dark"] as const) {
  test(`global 404 follows the ${scheme} system scheme`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: scheme });
    const page = await ctx.newPage();
    await page.goto("/static/missing.png");
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    expect(bg).toBe(scheme === "light" ? "rgb(244, 242, 238)" : "rgb(11, 11, 12)");
    await ctx.close();
  });
}

// Decision: the global page runs ThemeScript like every other page, so a theme the visitor picked with the toggle
// wins over the system scheme here too (ThemeScript reads document.cookie on the client; the server never reads the cookie. The page itself is dynamic,
// `ƒ /_not-found`, because it reads the locale request header).
test("global 404 honours the saved theme cookie over the system scheme", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ colorScheme: "light" });
  await ctx.addCookies([{ name: "theme", value: "dark", url: baseURL! }]);
  const page = await ctx.newPage();
  await page.goto("/static/missing.png");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  expect(bg).toBe("rgb(11, 11, 12)");
  await ctx.close();
});
