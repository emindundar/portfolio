import { test, expect } from "@playwright/test";

const SLUGS = ["geotrack", "kipgoz", "gymai", "karaoke-sync", "bio-astral", "notifyx", "cursor-notion-mcp"];

test.describe("/work/[slug]", () => {
  test("renders template sections and aside", async ({ page }) => {
    await page.goto("/en/work/geotrack");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("GeoTrack");
    for (const h of ["Problem", "Role", "Architecture", "Decisions", "Outcome"])
      await expect(page.getByRole("heading", { level: 2, name: h, exact: true })).toBeVisible();
    const aside = page.locator("[data-case-aside]");
    await expect(aside.getByRole("heading", { name: "Stack" })).toBeVisible();
    await expect(aside.getByText("Riverpod")).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/work\/geotrack$/);
  });

  test("architecture section renders a flow diagram as a labelled list", async ({ page }) => {
    await page.goto("/en/work/geotrack");
    const flow = page.getByRole("list", { name: "Search-to-navigation flow" });
    await expect(flow).toBeVisible();
    await expect(flow.getByRole("listitem")).toHaveCount(4);
    await expect(flow.getByRole("listitem").first()).toContainText("Address typed");
    await page.goto("/tr/work/geotrack");
    await expect(page.getByRole("list", { name: "Aramadan navigasyona akış" }).getByRole("listitem")).toHaveCount(4);
    for (const slug of SLUGS) {
      await page.goto(`/en/work/${slug}`);
      await expect(page.locator("main article ol[aria-label]"), slug).toHaveCount(1);
    }
  });

  test("hero image cover is fetched eagerly with high priority; gallery stays lazy", async ({ page }) => {
    await page.goto("/en/work/geotrack");
    const cover = page.locator("main [data-frame=phone] img");
    await expect(cover).toHaveAttribute("loading", "eager");
    await expect(cover).toHaveAttribute("fetchpriority", "high");
    await expect(cover).toHaveAttribute("alt", "");
  });

  test("each repository is its own external link named after the repo", async ({ page }) => {
    await page.goto("/en/work/geotrack");
    const repos = page.getByRole("link", { name: /repository/i });
    await expect(repos).toHaveCount(4);
    await expect(repos.first()).toHaveAttribute("href", /github\.com\/emindundar\/map_tracking$/);
    const named = page.getByRole("link", { name: "Repository: map_tracking (opens in a new tab)", exact: true });
    await expect(named).toHaveAttribute("target", "_blank");
    await expect(named).toHaveAttribute("rel", "noreferrer noopener");
    await page.goto("/en/work/karaoke-sync");
    await expect(page.getByRole("link", { name: /^Live/ })).toHaveAttribute("href", "https://evrekakaraoke.vercel.app");
  });

  test("case without cover shows the typographic cover", async ({ page }) => {
    await page.goto("/en/work/cursor-notion-mcp");
    await expect(page.locator("main [data-typo-cover]")).toHaveCount(1);
    await expect(page.locator("main img, main video")).toHaveCount(0);
  });

  test("video cover: reduced motion shows poster only; motion lays the video over the same poster", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en/work/karaoke-sync");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await expect(page.locator("main video")).toHaveCount(0);
    await expect(page.locator("main img[data-video-poster]")).toHaveCount(1);
    await expect(page.locator("main img[data-video-poster]")).toHaveAttribute("src", /poster-1280/);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en/work/karaoke-sync");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
    const video = page.locator("main video[data-video-cover]");
    const poster = page.locator("main img[data-video-poster]");
    await expect(video).toHaveCount(1);
    await expect(poster).toHaveCount(1);
    await expect(poster).toHaveAttribute("loading", "eager");
    await expect(poster).toHaveAttribute("alt", "");
    // The video sits 1px inside the poster: its first frame is never a larger paint, so the poster stays the LCP element.
    const [v, i] = [(await video.boundingBox())!, (await poster.boundingBox())!];
    expect(i.width - v.width).toBeGreaterThanOrEqual(1.5);
    expect(i.width - v.width).toBeLessThanOrEqual(2.5);
    expect(i.height - v.height).toBeGreaterThanOrEqual(1.5);
    expect(i.height - v.height).toBeLessThanOrEqual(2.5);
    expect(v.x).toBeGreaterThan(i.x);
    expect(v.y).toBeGreaterThan(i.y);
  });

  test("video cover can be paused and resumed (WCAG 2.2.2); no control under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en/work/karaoke-sync");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
    const video = page.locator("main video[data-video-cover]");
    const pause = page.getByRole("button", { name: "Pause video" });
    await expect(pause).toBeVisible();
    const box = (await pause.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
    await pause.click();
    await expect(page.getByRole("button", { name: "Play video" })).toBeVisible();
    await expect(video).toHaveAttribute("data-paused", "");
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await page.getByRole("button", { name: "Play video" }).click();
    await expect(page.getByRole("button", { name: "Pause video" })).toBeVisible();
    await expect(video).not.toHaveAttribute("data-paused", "");

    await page.goto("/tr/work/karaoke-sync");
    await expect(page.getByRole("button", { name: "Videoyu duraklat" })).toBeVisible();

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en/work/karaoke-sync");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await expect(page.locator("main [data-video-toggle]")).toHaveCount(0);
  });

  test("prev/next navigation follows order", async ({ page }) => {
    await page.goto("/en/work/geotrack");
    const nav = page.getByRole("navigation", { name: "Case navigation" });
    await expect(nav.getByRole("link", { name: /next/i })).toHaveAttribute("href", /\/en\/work\/kipgoz$/);
    await expect(nav.getByRole("link", { name: /previous/i })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "All work" })).toHaveAttribute("href", /\/en\/work$/);

    await page.goto("/en/work/cursor-notion-mcp");
    await expect(nav.getByRole("link", { name: /previous/i })).toHaveAttribute("href", /\/en\/work\/notifyx$/);
    await expect(nav.getByRole("link", { name: /next/i })).toHaveCount(0);

    await page.goto("/en/work/kipgoz");
    await expect(page.locator("html")).toHaveAttribute("data-motion", /./);
    await nav.getByRole("link", { name: /next/i }).click();
    await expect(page).toHaveURL(/\/en\/work\/gymai$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("GymAI");
  });

  test("turkish case renders Turkish headings, credits and the gallery for gymai", async ({ page }) => {
    await page.goto("/tr/work/gymai");
    await expect(page.locator("html")).toHaveAttribute("lang", "tr");
    await expect(page.getByRole("heading", { level: 2, name: "Kararlar" })).toBeVisible();
    await expect(page.locator("[data-case-credits]")).toHaveText("Lisans tezi, Pamukkale Üniversitesi YBS (2025), Beyzanur Eren ile; danışman Doç. Dr. Ömer Güleç");
    await expect(page.locator("[data-case-credits]")).not.toContainText("thesis");
    const gallery = page.locator("[data-case-gallery] img");
    await expect(gallery).toHaveCount(2);
    await expect(gallery.first()).toHaveAttribute("alt", "GymAI tez posteri: amaç, yöntem ve sonuç bölümleri");
    await page.goto("/en/work/gymai");
    await expect(gallery.first()).toHaveAttribute("alt", "GymAI thesis poster: goal, method and results sections");
    await expect(gallery.last()).toHaveAttribute("alt", "GymAI screens: fitness chatbot and gym occupancy with appointment booking");
    await expect(gallery.first()).toHaveAttribute("loading", "lazy");
    await expect(page.locator("[data-case-credits]")).toContainText("Assoc. Prof. Ömer Güleç");
  });

  test("client is localized on kipgoz", async ({ page }) => {
    await page.goto("/tr/work/kipgoz");
    await expect(page.locator("[data-case-aside]").getByRole("heading", { name: "Müşteri" })).toBeVisible();
    await expect(page.locator("[data-case-client]")).toHaveText("Bir özel eğitim kurumu");
    await page.goto("/en/work/kipgoz");
    await expect(page.locator("[data-case-client]")).toHaveText("A special-education institution");
  });

  test("narrow image cover is never upscaled", async ({ page }) => {
    await page.goto("/en/work/gymai");
    const cover = page.locator("main [data-frame=none] img");
    await expect(cover).toBeVisible();
    const width = await cover.evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBeLessThanOrEqual(368);
  });

  test("list row navigates to the case page", async ({ page }) => {
    await page.goto("/en/work");
    await expect(page.locator("html")).toHaveAttribute("data-motion", /./);
    await expect(page.locator("[data-work-list]")).toHaveAttribute("data-work-ready", "all");
    await page.locator("[data-work-item]").first().getByRole("link").click();
    await expect(page).toHaveURL(/\/en\/work\/geotrack$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("GeoTrack");
    // cacheComponents keeps the previous route mounted but hidden (<Activity>), hence `:visible`.
    await expect(page.locator("main [data-frame=phone] img:visible")).toHaveCount(1);
  });

  test("every case page responds 200", async ({ page }) => {
    for (const slug of SLUGS) {
      const res = await page.request.get(`/en/work/${slug}`);
      expect(res.status(), slug).toBe(200);
    }
  });

  test("unknown slug is 404", async ({ page }) => {
    const res = await page.goto("/en/work/nope");
    expect(res?.status()).toBe(404);
  });
});
