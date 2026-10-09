# Faz 1.5: Polish and Launch Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the live site correct for search engines and link previews, give it a real localized 404, bring LCP under budget, close the accessibility and security gaps deferred from Faz 1b/1c, and leave domain switch-over as a single documented owner step.

**Architecture:** One source of truth for the site origin (`lib/seo.ts`, environment-driven) feeds canonical URLs, hreflang, sitemap, robots, JSON-LD and Open Graph images. Structured data is built by pure functions in `lib/jsonld.ts` and rendered by one server component. OG images are static `ImageResponse` files generated at build from committed OTF/TTF fonts. Security headers are static (`next.config.ts`), so every page stays prerendered.

**Tech Stack:** Next.js 16.4 metadata file conventions (`sitemap.ts`, `robots.ts`, `opengraph-image.tsx`, `global-not-found.tsx`), `next/og` `ImageResponse`, schema.org JSON-LD, `@axe-core/playwright`, LHCI.

**Spec:** `docs/superpowers/specs/2026-10-07-portfolio-design.md` — §4.6 (SEO and sharing), §4.7 (performance budget), §4.8 (accessibility), §4.9 (error handling), §4.10 (tests), §5.2 (phase 1.5). `CLAUDE.md` rules and "Learned constraints" are binding.

## Global Constraints

- Locales `en` (default), `tr`; every user-facing string in `messages/{en,tr}.json` with identical key sets.
- Pages and layouts are server components; `"use client"` only where `CLAUDE.md` allows.
- Tokens only (`bg, surface, line, fg, muted, accent`); no arbitrary colours, no border-radius, no shadows.
- `cacheComponents: true`: no `new Date()`, `fetch`, `cookies()`, `headers()` in page/layout render outside a `"use cache"` scope. Every page stays static (`○`/`●`) except `/work` (`◐`).
- Tailwind sources are an allow-list (`app`, `components`, `lib`, `content`); class names anywhere else are not generated. Never quote arbitrary-`url()` class names in documents.
- `experimental.turbopackFileSystemCacheForBuild` stays `false`.
- Performance budget: first-load JS ≤ 180 KB gz; LHCI total script ≤ 256 KB; CLS ≤ 0.05; LCP < 2.0 s; perf ≥ 0.9; a11y ≥ 0.95; SEO = 1.
- WCAG 2.1 AA: text contrast ≥ 4.5:1 (≥ 3:1 for large text and non-text UI), targets ≥ 44 px, visible focus.
- No secret, token or site id is committed. Build-time env is read at module scope.
- Tests: a test with every behaviour change; e2e waits on state, never on fixed sleeps. `pnpm build` before `pnpm e2e`. Ports 3100 / 3101.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Decisions taken in this plan (owner approves with the plan)

1. **Site origin is environment-driven.** `SITE_URL` is hard-coded to `https://emindundar.dev` today, a domain that is not registered yet, so every canonical and hreflang URL on the live site points to a host that does not resolve. New order: `NEXT_PUBLIC_SITE_URL` → `https://$VERCEL_PROJECT_PRODUCTION_URL` → `http://localhost:3000`. After the domain is bought the owner sets one variable.
2. **Light-theme accent is darkened** until button text (`bg` on `accent`) reaches 4.5:1. Today `#e04300` on `#f4f2ee` is 3.78:1. Dark theme is unchanged.
3. **404:** a bilingual `app/global-not-found.tsx` (English and Turkish together, system colour scheme) for URLs that match no route; the localized `not-found.tsx` stays for `notFound()` inside a locale and gets the system styling it lacks.
4. **CSP without nonces.** A nonce forces every page to render per request, which would give up the static pages and the performance budget. The policy restricts origins, framing, forms and plugins and allows inline scripts; this is recorded as a known limitation.
5. **LHCI:** three runs, median aggregation; LCP becomes an error gate at 2.5 s (warn at 2.0 s) once Task 5 lands.

## Review Focus

1. Someone shares `/tr/work/geotrack` in a chat app → preview shows the Turkish title, a 1200×630 image and the correct absolute URL on the live host (Tasks 1, 3).
2. A crawler requests `/sitemap.xml` → every listed URL answers 200 on the same host, both locales, with hreflang pairs; `/robots.txt` points to it (Task 1).
3. A visitor mistypes a URL (`/tr/wrok`, `/xyz`, `/en/work/unknown`) → real 404 status, readable page in their language or both, a way home, in light and dark system themes (Task 4).
4. A project title contains `</script>` or a quote → JSON-LD stays valid and nothing executes (Task 2).
5. A light-theme, keyboard-only visitor → every control has a visible focus ring and readable text; no page fails axe (Task 6).

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/seo.ts` | `SITE_URL`, `absoluteUrl`, `alternatesFor`, `PAGE_PATHS`, `openGraphFor` |
| `app/sitemap.ts`, `app/robots.ts` | Metadata routes built from `PAGE_PATHS` + projects |
| `lib/jsonld.ts` | Pure builders `personLd`, `websiteLd`, `caseLd`, `serializeLd` |
| `components/seo/JsonLd.tsx` | Server component rendering one `<script type="application/ld+json">` |
| `lib/og/` (`fonts.ts`, `template.tsx`) | Font loading and the shared OG layout |
| `assets/fonts/*.otf|ttf` | Static fonts for `ImageResponse` (not served) |
| `app/[locale]/opengraph-image.tsx`, `app/[locale]/work/[slug]/opengraph-image.tsx` | Static OG images |
| `app/global-not-found.tsx`, `app/[locale]/not-found.tsx` | 404 pages |
| `components/ui/ExternalLink.tsx` | One implementation of the new-tab link with its screen-reader note |
| `next.config.ts` | Security headers |
| `e2e/seo.spec.ts`, `e2e/a11y.spec.ts`, `e2e/notfound.spec.ts` | Browser checks |

---

### Task 1: Site origin, sitemap, robots, Open Graph base metadata

**Files:**
- Modify: `lib/seo.ts`, `lib/seo.test.ts`, `app/[locale]/layout.tsx`, every `generateMetadata` (home, work, case, about, services, colophon, contact), `.env.example`, `messages/{en,tr}.json` (`Contact.privacy`: mention the language cookie)
- Create: `app/sitemap.ts`, `app/robots.ts`, `lib/sitemap.test.ts`, `e2e/seo.spec.ts`

**Interfaces — Produces:**

```ts
// lib/seo.ts
export const SITE_URL: string;                       // no trailing slash
export function resolveSiteUrl(env: Record<string, string | undefined>): string;
export function absoluteUrl(path: string): string;   // absoluteUrl("/en/work") → `${SITE_URL}/en/work`
export const PAGE_PATHS: readonly string[];          // ["", "/work", "/about", "/services", "/colophon", "/contact"]
export function alternatesFor(path: string, locale: Locale): Metadata["alternates"]; // unchanged shape
export function openGraphFor(input: { path: string; locale: Locale; title: string; description: string; type?: "website" | "article" }): Pick<Metadata, "openGraph" | "twitter">;
// app/sitemap.ts
export function buildSitemap(slugs: string[], lastModified: Date): MetadataRoute.Sitemap;
```

- [ ] **Step 1: Failing tests for the origin**

Add to `lib/seo.test.ts`:

```ts
import { resolveSiteUrl, absoluteUrl, openGraphFor, PAGE_PATHS, SITE_URL } from "./seo";

describe("resolveSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL and strips a trailing slash", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://emindundar.dev/", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe("https://emindundar.dev");
  });
  it("falls back to the Vercel production host", () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "eminsportfolio.vercel.app" })).toBe("https://eminsportfolio.vercel.app");
  });
  it("falls back to localhost when nothing is set", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });
  it.each(["ftp://x.dev", "javascript:alert(1)", "not a url", "https://"])("ignores an invalid value %j", (bad) => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: bad, VERCEL_PROJECT_PRODUCTION_URL: "a.vercel.app" })).toBe("https://a.vercel.app");
  });
  it("drops any path, query or hash from the configured value", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://emindundar.dev/tr?x=1#y" })).toBe("https://emindundar.dev");
  });
});

describe("absoluteUrl / openGraphFor", () => {
  it("joins the origin and a path", () => {
    expect(absoluteUrl("/en/work")).toBe(`${SITE_URL}/en/work`);
    expect(absoluteUrl("en")).toBe(`${SITE_URL}/en`);
  });
  it("builds Open Graph and Twitter metadata for a page", () => {
    const m = openGraphFor({ path: "/work/geotrack", locale: "tr", title: "T", description: "D", type: "article" });
    expect(m.openGraph).toMatchObject({ type: "article", url: "/tr/work/geotrack", title: "T", description: "D", siteName: "Emin Dündar", locale: "tr_TR", alternateLocale: ["en_US"] });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "T", description: "D" });
  });
  it("lists every static page once", () => {
    expect(PAGE_PATHS).toEqual(["", "/work", "/about", "/services", "/colophon", "/contact"]);
  });
});
```

Run: `pnpm vitest run lib/seo.test.ts` — Expected: FAIL (`resolveSiteUrl` is not exported).

- [ ] **Step 2: Implement `lib/seo.ts`**

```ts
import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";

/** Origin only. Order: explicit setting, Vercel's production host, local development. */
export function resolveSiteUrl(env: Record<string, string | undefined>): string {
  const candidates = [env.NEXT_PUBLIC_SITE_URL, env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`];
  for (const value of candidates) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if ((url.protocol === "https:" || url.protocol === "http:") && url.hostname) return url.origin;
    } catch {
      // not a URL: try the next candidate
    }
  }
  return "http://localhost:3000";
}

// Literal property access so the bundler inlines NEXT_PUBLIC_SITE_URL.
export const SITE_URL = resolveSiteUrl({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
});

export const SITE_NAME = "Emin Dündar";
export const PAGE_PATHS = ["", "/work", "/about", "/services", "/colophon", "/contact"] as const;
const OG_LOCALE: Record<Locale, string> = { en: "en_US", tr: "tr_TR" };

function join(locale: Locale, path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  const clean = trimmed === "" ? "" : trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `/${locale}${clean}`;
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function alternatesFor(path: string, locale: Locale): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = join(l, path);
  languages["x-default"] = join(routing.defaultLocale, path);
  return { canonical: join(locale, path), languages };
}

export function openGraphFor(input: { path: string; locale: Locale; title: string; description: string; type?: "website" | "article" }): Pick<Metadata, "openGraph" | "twitter"> {
  const { path, locale, title, description, type = "website" } = input;
  return {
    openGraph: {
      type, url: join(locale, path), title, description, siteName: SITE_NAME,
      locale: OG_LOCALE[locale], alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
```

`VERCEL_PROJECT_PRODUCTION_URL` is a system variable Vercel exposes at build time; it is not `NEXT_PUBLIC_`, so `SITE_URL` must only be evaluated on the server (metadata, sitemap, JSON-LD). Grep for client imports of `lib/seo` (`grep -rn "lib/seo" components app | xargs grep -l '"use client"'`); there must be none.

Run: `pnpm vitest run lib/seo.test.ts` — Expected: PASS. The existing `alternatesFor` test keeps passing unchanged.

- [ ] **Step 3: Use `openGraphFor` on every page**

In each `generateMetadata`, spread the helper next to `alternates`. Example, case page:

```ts
return {
  title: p.title, description: p.summary,
  alternates: alternatesFor(`/work/${slug}`, locale),
  ...openGraphFor({ path: `/work/${slug}`, locale, title: p.title, description: p.summary, type: "article" }),
};
```

Layout (`app/[locale]/layout.tsx`): keep `metadataBase: new URL(SITE_URL)`; add `...openGraphFor({ path: "/", locale, title: t("title"), description: t("description") })` so pages without their own values inherit a sane default. Home page: same call with the `Meta` strings. Work, about, services, colophon, contact: their own `title`/`description`.

- [ ] **Step 4: Sitemap and robots, test first**

Create `lib/sitemap.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildSitemap } from "@/app/sitemap";
import { SITE_URL } from "./seo";

describe("buildSitemap", () => {
  const map = buildSitemap(["geotrack", "kipgoz"], new Date("2026-10-09T00:00:00Z"));
  it("lists every static page and case in both locales", () => {
    const urls = map.map((e) => e.url);
    expect(urls).toHaveLength((6 + 2) * 2);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain(`${SITE_URL}/en`);
    expect(urls).toContain(`${SITE_URL}/tr/contact`);
    expect(urls).toContain(`${SITE_URL}/tr/work/kipgoz`);
  });
  it("gives each entry absolute hreflang alternates including x-default", () => {
    const entry = map.find((e) => e.url === `${SITE_URL}/tr/work/geotrack`)!;
    expect(entry.alternates?.languages).toEqual({
      en: `${SITE_URL}/en/work/geotrack`, tr: `${SITE_URL}/tr/work/geotrack`, "x-default": `${SITE_URL}/en/work/geotrack`,
    });
    expect(entry.lastModified).toEqual(new Date("2026-10-09T00:00:00Z"));
  });
  it("never emits a trailing slash or a double slash in the path", () => {
    for (const e of map) expect(new URL(e.url).pathname).toMatch(/^\/(en|tr)(\/[a-z0-9-]+)*$/);
  });
});
```

Create `app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getProjects } from "@/lib/content";
import { PAGE_PATHS, absoluteUrl } from "@/lib/seo";

// Build time, at module scope (cacheComponents forbids reading the clock during render).
const BUILT_AT = new Date();

export function buildSitemap(slugs: string[], lastModified: Date): MetadataRoute.Sitemap {
  const paths = [...PAGE_PATHS, ...slugs.map((s) => `/work/${s}`)];
  return paths.flatMap((path) => {
    const languages: Record<string, string> = Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(`/${l}${path}`)]));
    languages["x-default"] = absoluteUrl(`/${routing.defaultLocale}${path}`);
    return routing.locales.map((locale) => ({ url: absoluteUrl(`/${locale}${path}`), lastModified, alternates: { languages } }));
  });
}

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap(getProjects(routing.defaultLocale).map((p) => p.slug), BUILT_AT);
}
```

Create `app/robots.ts`:

```ts
import type { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/" }], sitemap: absoluteUrl("/sitemap.xml"), host: SITE_URL };
}
```

`proxy.ts` matcher already skips paths containing a dot, so `/sitemap.xml` and `/robots.txt` are not locale-redirected; the e2e below proves it. If the build rejects the module-scope `new Date()` in a metadata route, wrap `sitemap()` in `"use cache"` instead and report it.

- [ ] **Step 5: e2e**

Create `e2e/seo.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const PAGES = ["", "/work", "/about", "/services", "/colophon", "/contact", "/work/geotrack"];

test("robots.txt allows everything and names the sitemap", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/User-Agent: \*/i);
  expect(body).toMatch(/Allow: \//);
  expect(body).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);
});

test("every sitemap URL resolves on this server and has hreflang pairs", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  expect(locs.length).toBeGreaterThanOrEqual(PAGES.length * 2);
  expect(xml).toMatch(/hreflang="x-default"/);
  for (const path of locs) expect((await request.get(path)).status(), path).toBe(200);
});

for (const locale of ["en", "tr"] as const) {
  for (const page of PAGES) {
    test(`${locale}${page || "/"}: canonical, hreflang and Open Graph are complete and self-consistent`, async ({ page: p }) => {
      await p.goto(`/${locale}${page}`);
      const canonical = await p.locator('link[rel="canonical"]').getAttribute("href");
      expect(new URL(canonical!).pathname).toBe(`/${locale}${page}`);
      const ogUrl = await p.locator('meta[property="og:url"]').getAttribute("content");
      expect(ogUrl).toBe(canonical);
      for (const l of ["en", "tr", "x-default"]) await expect(p.locator(`link[rel="alternate"][hreflang="${l}" i]`)).toHaveCount(1);
      await expect(p.locator('meta[property="og:locale"]')).toHaveAttribute("content", locale === "tr" ? "tr_TR" : "en_US");
      await expect(p.locator('meta[property="og:site_name"]')).toHaveAttribute("content", "Emin Dündar");
      await expect(p.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
      const title = await p.title();
      const ogTitle = await p.locator('meta[property="og:title"]').getAttribute("content");
      expect(title).toContain(ogTitle!.replace(/ — Emin Dündar$/, ""));
      const desc = await p.locator('meta[name="description"]').getAttribute("content");
      expect(desc!.length).toBeGreaterThanOrEqual(50);
      expect(desc!.length).toBeLessThanOrEqual(170);
    });
  }
}
```

If a description is outside 50–170 characters, fix the message string (both locales), not the test. Titles longer than 60 characters including the suffix: shorten the message.

- [ ] **Step 6: Env docs and privacy copy**

`.env.example`: add

```bash
# Public origin of the site, no trailing slash. Unset on Vercel = the project's production host.
# Set to https://emindundar.dev after the domain is connected.
NEXT_PUBLIC_SITE_URL=
```

`Contact.privacy` last sentence — EN: "The only things stored in your browser are your theme and language choices." TR: "Tarayıcınızda yalnızca tema ve dil tercihiniz saklanır." (next-intl sets a `NEXT_LOCALE` cookie.) Update the unit test that matches this text.

- [ ] **Step 7: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`
Expected: clean; build table lists `/sitemap.xml` and `/robots.txt`. Then `curl -s localhost:3100/sitemap.xml | head -20` after starting `pnpm exec next start -p 3100` and paste the head into the report.

```bash
git add -A
git commit -m "feat(seo): environment-driven site origin, sitemap, robots, Open Graph metadata"
```

---

### Task 2: Structured data (JSON-LD)

**Files:**
- Create: `lib/jsonld.ts`, `lib/jsonld.test.ts`, `components/seo/JsonLd.tsx`, `components/seo/JsonLd.test.tsx`
- Modify: `app/[locale]/layout.tsx`, `app/[locale]/work/[slug]/page.tsx`, `e2e/seo.spec.ts`

**Interfaces:**
- Consumes: `SITE_URL`, `absoluteUrl`, `SITE_NAME` (Task 1); `GITHUB_URL`, `LINKEDIN_URL` (`lib/site.ts`); `Project` (`lib/content`).
- Produces:

```ts
export type Ld = Record<string, unknown>;
export function personLd(input: { locale: Locale; jobTitle: string; description: string; knowsAbout: string[] }): Ld;
export function websiteLd(input: { locale: Locale; description: string }): Ld;
export function caseLd(input: { locale: Locale; project: Pick<Project, "slug" | "title" | "summary" | "year" | "stack">; image?: string }): Ld;
export function serializeLd(data: Ld | Ld[]): string;
```

- [ ] **Step 1: Failing tests**

Create `lib/jsonld.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { caseLd, personLd, serializeLd, websiteLd } from "./jsonld";
import { SITE_URL } from "./seo";

const PERSON_ID = `${SITE_URL}/#person`;

describe("personLd", () => {
  const ld = personLd({ locale: "tr", jobTitle: "Yazılım Geliştirici", description: "D", knowsAbout: ["Flutter", "NestJS"] });
  it("describes the owner with a stable id and profile links", () => {
    expect(ld).toMatchObject({
      "@context": "https://schema.org", "@type": "Person", "@id": PERSON_ID, name: "Emin Dündar",
      url: `${SITE_URL}/tr`, jobTitle: "Yazılım Geliştirici", description: "D", knowsAbout: ["Flutter", "NestJS"],
    });
    expect(ld.sameAs).toEqual(["https://github.com/emindundar", "https://www.linkedin.com/in/emindundar"]);
  });
  it("publishes no e-mail, phone or street address", () => {
    expect(JSON.stringify(ld)).not.toMatch(/@gmail|telephone|streetAddress|email/i);
  });
});

describe("websiteLd", () => {
  it("links the site to the person and declares the language", () => {
    expect(websiteLd({ locale: "en", description: "D" })).toMatchObject({
      "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/en`, name: "Emin Dündar", inLanguage: "en", publisher: { "@id": PERSON_ID },
    });
  });
});

describe("caseLd", () => {
  const project = { slug: "geotrack", title: "GeoTrack", summary: "S", year: 2026, stack: ["Flutter", "NestJS"] };
  it("is a CreativeWork by the person, with keywords from the stack", () => {
    expect(caseLd({ locale: "tr", project, image: "/tr/work/geotrack/opengraph-image" })).toMatchObject({
      "@type": "CreativeWork", "@id": `${SITE_URL}/tr/work/geotrack#work`, url: `${SITE_URL}/tr/work/geotrack`,
      name: "GeoTrack", description: "S", inLanguage: "tr", dateCreated: "2026", keywords: "Flutter, NestJS",
      author: { "@id": PERSON_ID }, image: `${SITE_URL}/tr/work/geotrack/opengraph-image`,
    });
  });
  it("omits image when none is given", () => {
    expect(caseLd({ locale: "en", project })).not.toHaveProperty("image");
  });
});

describe("serializeLd", () => {
  it("cannot break out of the script element", () => {
    const out = serializeLd({ name: "</script><script>alert(1)</script>", note: "a & b <!-- c -->    " });
    expect(out).not.toContain("</script");
    expect(out).not.toContain("<!--");
    expect(out).not.toMatch(/[<>&  ]/);
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script>", note: "a & b <!-- c -->    " });
  });
  it("serializes an array as a JSON array", () => {
    expect(JSON.parse(serializeLd([{ a: 1 }, { b: 2 }]))).toEqual([{ a: 1 }, { b: 2 }]);
  });
});
```

Run: `pnpm vitest run lib/jsonld.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 2: Implement**

`lib/jsonld.ts`:

```ts
import type { Locale } from "@/i18n/routing";
import type { Project } from "@/lib/content";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";
import { GITHUB_URL, LINKEDIN_URL } from "@/lib/site";

export type Ld = Record<string, unknown>;
const CONTEXT = "https://schema.org";
const PERSON_ID = `${SITE_URL}/#person`;

export function personLd(input: { locale: Locale; jobTitle: string; description: string; knowsAbout: string[] }): Ld {
  return {
    "@context": CONTEXT, "@type": "Person", "@id": PERSON_ID, name: SITE_NAME, url: absoluteUrl(`/${input.locale}`),
    jobTitle: input.jobTitle, description: input.description, knowsAbout: input.knowsAbout, sameAs: [GITHUB_URL, LINKEDIN_URL],
  };
}

export function websiteLd(input: { locale: Locale; description: string }): Ld {
  return {
    "@context": CONTEXT, "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: absoluteUrl(`/${input.locale}`),
    name: SITE_NAME, description: input.description, inLanguage: input.locale, publisher: { "@id": PERSON_ID },
  };
}

export function caseLd(input: { locale: Locale; project: Pick<Project, "slug" | "title" | "summary" | "year" | "stack">; image?: string }): Ld {
  const { locale, project, image } = input;
  const url = absoluteUrl(`/${locale}/work/${project.slug}`);
  return {
    "@context": CONTEXT, "@type": "CreativeWork", "@id": `${url}#work`, url, name: project.title, description: project.summary,
    inLanguage: locale, dateCreated: String(project.year), keywords: project.stack.join(", "), author: { "@id": PERSON_ID },
    ...(image ? { image: absoluteUrl(image) } : {}),
  };
}

const ESCAPES: Record<string, string> = { "<": "\\u003c", ">": "\\u003e", "&": "\\u0026", " ": "\\u2028", " ": "\\u2029" };
/** JSON that is safe inside a <script> element: no `<`, `>`, `&` or JS line separators survive. */
export function serializeLd(data: Ld | Ld[]): string {
  return JSON.stringify(data).replace(/[<>&  ]/g, (c) => ESCAPES[c]!);
}
```

`components/seo/JsonLd.tsx`:

```tsx
import { serializeLd, type Ld } from "@/lib/jsonld";

/** The only place that writes raw markup; the payload goes through serializeLd. */
export function JsonLd({ data }: { data: Ld | Ld[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeLd(data) }} />;
}
```

`components/seo/JsonLd.test.tsx`: render with `{ name: "</script>" }`, assert exactly one `script[type="application/ld+json"]` whose `textContent` parses back to the input and whose `innerHTML` contains no `</script`.

- [ ] **Step 3: Mount**

Layout: inside `<body>`, before `<NextIntlClientProvider>`, render `<JsonLd data={[personLd(...), websiteLd(...)]} />`. Inputs: `jobTitle` from a new message `Meta.jobTitle` (EN "Software Developer", TR "Yazılım Geliştirici"), `description` from `Meta.description`, `knowsAbout` = the five facet labels from the `Capabilities` namespace followed by the de-duplicated union of every project's `stack` (cap at 30 entries, order of first appearance).

Case page: `<JsonLd data={caseLd({ locale, project: p, image: \`/${locale}/work/${slug}/opengraph-image\` })} />` as the first child of `<main>`. The image path exists after Task 3; until then pass no image and add it in Task 3.

- [ ] **Step 4: e2e**

Append to `e2e/seo.spec.ts`:

```ts
async function ld(page: import("@playwright/test").Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((b) => { const v = JSON.parse(b); return Array.isArray(v) ? v : [v]; });
}

test("every page carries Person and WebSite data; a case adds a CreativeWork by that person", async ({ page }) => {
  await page.goto("/tr");
  const home = await ld(page);
  const person = home.find((x) => x["@type"] === "Person");
  expect(person).toMatchObject({ name: "Emin Dündar", jobTitle: "Yazılım Geliştirici" });
  expect(person.sameAs).toHaveLength(2);
  expect(person.knowsAbout.length).toBeGreaterThanOrEqual(5);
  expect(home.find((x) => x["@type"] === "WebSite")).toMatchObject({ inLanguage: "tr" });

  await page.goto("/tr/work/geotrack");
  const work = (await ld(page)).find((x) => x["@type"] === "CreativeWork");
  expect(work.author["@id"]).toBe(person["@id"]);
  expect(new URL(work.url).pathname).toBe("/tr/work/geotrack");
  expect(work.name).toBe(await page.getByRole("heading", { level: 1 }).innerText());
});
```

- [ ] **Step 5: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`

```bash
git add -A
git commit -m "feat(seo): Person, WebSite and CreativeWork structured data"
```

---

### Task 3: Open Graph images

**Files:**
- Create: `assets/fonts/CabinetGrotesk-Extrabold.otf`, `assets/fonts/JetBrainsMono-Regular.ttf`, `assets/fonts/README.md`, `lib/og/fonts.ts`, `lib/og/template.tsx`, `lib/og/template.test.tsx`, `app/[locale]/opengraph-image.tsx`, `app/[locale]/work/[slug]/opengraph-image.tsx`
- Modify: `app/[locale]/work/[slug]/page.tsx` (JSON-LD image), `e2e/seo.spec.ts`

**Interfaces — Produces:**

```ts
// lib/og/template.tsx
export const OG_SIZE = { width: 1200, height: 630 } as const;
export function OgTemplate(props: { eyebrow: string; title: string; footer: string }): React.JSX.Element;
export function fitTitle(title: string): { fontSize: number; text: string };
// lib/og/fonts.ts
export function ogFonts(): Promise<{ name: string; data: Buffer; weight: 400 | 800; style: "normal" }[]>;
```

- [ ] **Step 1: Fonts**

`ImageResponse` accepts only `ttf`, `otf`, `woff` — not the variable `woff2` files in `public/fonts`.
- Cabinet Grotesk Extrabold: copy from the owner's licensed kit, `/Users/emindundar/Downloads/CabinetGrotesk_Complete/Fonts/OTF/CabinetGrotesk-Extrabold.otf`. If the file is missing, stop and report BLOCKED (do not download a substitute).
- JetBrains Mono Regular (SIL OFL 1.1): take the `.ttf` from the official `JetBrains/JetBrainsMono` GitHub release archive; verify the file's name table says "JetBrains Mono" and record the release tag and SHA-256 in `assets/fonts/README.md` together with both licences (Cabinet Grotesk: Fontshare free licence, Indian Type Foundry).
- `assets/` is outside the Tailwind allow-list and outside `public/`: the files are read at build time only.

- [ ] **Step 2: Failing test for the pure parts**

Create `lib/og/template.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { fitTitle, OG_SIZE } from "./template";

describe("fitTitle", () => {
  it("keeps short titles large", () => expect(fitTitle("GeoTrack")).toEqual({ fontSize: 112, text: "GeoTrack" }));
  it("steps the size down as the title grows", () => {
    const sizes = [20, 45, 70, 100].map((n) => fitTitle("x".repeat(n)).fontSize);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(56);
  });
  it("cuts an over-long title at a word boundary with an ellipsis", () => {
    const out = fitTitle("word ".repeat(60).trim());
    expect(out.text.length).toBeLessThanOrEqual(121);
    expect(out.text.endsWith("…")).toBe(true);
    expect(out.text).not.toMatch(/\s…$/);
  });
  it("keeps Turkish characters intact", () => expect(fitTitle("Saha Rotalama ve Canlı Konum Backend'i").text).toContain("ı"));
});

it("uses the standard Open Graph size", () => expect(OG_SIZE).toEqual({ width: 1200, height: 630 }));
```

Run: `pnpm vitest run lib/og/template.test.tsx` — Expected: FAIL.

- [ ] **Step 3: Implement**

`lib/og/fonts.ts`:

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const dir = join(process.cwd(), "assets", "fonts");

export async function ogFonts() {
  const [display, mono] = await Promise.all([readFile(join(dir, "CabinetGrotesk-Extrabold.otf")), readFile(join(dir, "JetBrainsMono-Regular.ttf"))]);
  return [
    { name: "Cabinet Grotesk", data: display, weight: 800 as const, style: "normal" as const },
    { name: "JetBrains Mono", data: mono, weight: 400 as const, style: "normal" as const },
  ];
}
```

`lib/og/template.tsx` — spec §4.6: black ground, Cabinet Grotesk title, monospace meta, accent line. Satori supports flexbox only and needs literal colours (these are image pixels, not UI classes; the "tokens only" rule applies to site styling). Use the dark-theme token values and name them:

```tsx
export const OG_SIZE = { width: 1200, height: 630 } as const;
// Dark-theme token values from app/globals.css; keep in sync by hand.
const BG = "#0b0b0c", FG = "#ededed", MUTED = "#8a8a90", ACCENT = "#ff4d00";
const MAX_CHARS = 120;

export function fitTitle(title: string): { fontSize: number; text: string } {
  let text = title.trim();
  if (text.length > MAX_CHARS) {
    const cut = text.slice(0, MAX_CHARS);
    text = `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 1)).trimEnd()}…`;
  }
  const n = text.length;
  return { fontSize: n <= 24 ? 112 : n <= 48 ? 88 : n <= 80 ? 68 : 56, text };
}

export function OgTemplate({ eyebrow, title, footer }: { eyebrow: string; title: string; footer: string }) {
  const fit = fitTitle(title);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: BG, color: FG, padding: 72 }}>
      <div style={{ display: "flex", alignItems: "center", fontFamily: "JetBrains Mono", fontSize: 26, color: MUTED, textTransform: "uppercase", letterSpacing: 2 }}>
        <div style={{ width: 18, height: 18, background: ACCENT, marginRight: 18 }} />
        {eyebrow}
      </div>
      <div style={{ display: "flex", fontFamily: "Cabinet Grotesk", fontWeight: 800, fontSize: fit.fontSize, lineHeight: 1, letterSpacing: -2 }}>{fit.text}</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ width: "100%", height: 6, background: ACCENT, marginBottom: 28 }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono", fontSize: 26, color: MUTED }}>
          <div style={{ display: "flex" }}>emin dündar</div>
          <div style={{ display: "flex" }}>{footer}</div>
        </div>
      </div>
    </div>
  );
}
```

`app/[locale]/opengraph-image.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ogFonts } from "@/lib/og/fonts";
import { OG_SIZE, OgTemplate } from "@/lib/og/template";
import { SITE_URL } from "@/lib/seo";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Emin Dündar";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Hero" });
  return new ImageResponse(<OgTemplate eyebrow={t("eyebrow")} title={t("headline")} footer={new URL(SITE_URL).host} />, { ...size, fonts: await ogFonts() });
}
```

`app/[locale]/work/[slug]/opengraph-image.tsx`: same shape; `generateStaticParams` identical to the case page's; eyebrow = the project's facet labels joined with " · " plus the year, title = `project.title`, footer = host. Unknown slug → `notFound()`.

Check the Next docs in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md` for the exact `params` typing and static-generation behaviour in 16.4 under `cacheComponents`; adapt and report. Nested pages (about, services, …) inherit the locale-level image automatically.

Add `image` to the case page's `caseLd` call (Task 2 Step 3).

- [ ] **Step 4: e2e**

Append to `e2e/seo.spec.ts`:

```ts
for (const path of ["/en", "/tr/about", "/tr/work/geotrack"]) {
  test(`${path}: og:image is a real 1200×630 PNG on this origin`, async ({ page, request }) => {
    await page.goto(path);
    const src = await page.locator('meta[property="og:image"]').getAttribute("content");
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
    const res = await request.get(new URL(src!).pathname + new URL(src!).search);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
    const buf = await res.body();
    expect(buf.readUInt32BE(16)).toBe(1200); // PNG IHDR width
    expect(buf.readUInt32BE(20)).toBe(630);
    expect(buf.length).toBeLessThan(300_000);
  });
}

test("the Turkish case image differs from the English one (localized title)", async ({ page, request }) => {
  const get = async (p: string) => {
    await page.goto(p);
    const u = new URL((await page.locator('meta[property="og:image"]').getAttribute("content"))!);
    return (await request.get(u.pathname + u.search)).body();
  };
  expect((await get("/en/work/geotrack")).equals(await get("/tr/work/geotrack"))).toBe(false);
});
```

- [ ] **Step 5: Look at the images**

Save `/en`, `/tr`, `/en/work/geotrack`, `/tr/work/bio-astral` (longest title) images to the scratchpad and view them (Read tool). Check: Turkish characters render (ı, ğ, ş, İ, ü — no tofu boxes), title does not clip or overflow, accent line and square present, nothing touches the edges. Fix `fitTitle` thresholds if a real title overflows; keep the unit tests in step.

- [ ] **Step 6: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e && pnpm lhci`
Expected: clean; the build table shows the image routes as static; build time increase reported.

```bash
git add -A
git commit -m "feat(seo): static Open Graph images per locale and per case"
```

---

### Task 4: 404 pages

**Files:**
- Create: `app/global-not-found.tsx`, `e2e/notfound.spec.ts`
- Modify: `next.config.ts` (`experimental.globalNotFound: true`), `app/[locale]/not-found.tsx`, `messages/{en,tr}.json` (only if a string is added), `CLAUDE.md` constraint about the client-rendered 404

**Interfaces:** none consumed by later tasks.

- [ ] **Step 1: Establish the facts first**

Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md` in full (the `global-not-found` section and "Status codes"). Then, on a production build (`pnpm build && pnpm exec next start -p 3100`), record for each URL the status code, whether the response HTML contains the 404 heading text (server-rendered) and the `<html lang>`:

| URL | Expected after this task |
|---|---|
| `/xyz` (no locale) | proxy redirects to `/en/xyz` → 404 |
| `/en/xyz`, `/tr/xyz` | 404, heading in HTML, `lang` matches |
| `/en/work/unknown-slug`, `/tr/work/unknown-slug` | 404, heading in HTML, `lang` matches |
| `/static/missing.png` (has a dot: proxy skips it) | 404, bilingual global page |

Put the before-table in the report. This decides how much of Step 2/3 is needed: if `/tr/xyz` already serves the heading in HTML with `lang="tr"`, only styling changes.

- [ ] **Step 2: Failing e2e**

Create `e2e/notfound.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const CASES = [
  { url: "/en/xyz", lang: "en", heading: "Page not found", home: "/en" },
  { url: "/tr/xyz", lang: "tr", heading: "Sayfa bulunamadı", home: "/tr" },
  { url: "/en/work/unknown-slug", lang: "en", heading: "Page not found", home: "/en" },
  { url: "/tr/work/unknown-slug", lang: "tr", heading: "Sayfa bulunamadı", home: "/tr" },
];

for (const c of CASES) {
  test(`${c.url}: real 404, server-rendered in ${c.lang}, with a way home`, async ({ page, request }) => {
    const res = await request.get(c.url);
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(html).toContain(c.heading);                      // present without JavaScript
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

test("a path no route matches gets the bilingual page with a 404 status", async ({ page, request }) => {
  const res = await request.get("/static/missing.png");
  expect(res.status()).toBe(404);
  await page.goto("/static/missing.png");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Page not found");
  await expect(page.locator('[lang="tr"]')).toContainText("Sayfa bulunamadı");
  await expect(page.getByRole("link", { name: /home/i })).toHaveAttribute("href", "/en");
  await expect(page.getByRole("link", { name: /ana sayfa/i })).toHaveAttribute("href", "/tr");
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
```

Use the real `NotFound.title` strings from the message files (check `messages/tr.json`; adjust the two Turkish literals above to match). Run: `pnpm build && pnpm e2e e2e/notfound.spec.ts` — Expected: FAIL on the server-rendering and/or global-page assertions.

- [ ] **Step 3: Global page**

`next.config.ts`: add `globalNotFound: true` to the existing `experimental` block (keep `turbopackFileSystemCacheForBuild: false`).

`app/global-not-found.tsx` — it bypasses every layout, so it imports styles and fonts itself and must be a full document. No translations provider is available; the copy is bilingual by design and comes from the message files directly:

```tsx
import type { Metadata } from "next";
import en from "@/messages/en.json";
import tr from "@/messages/tr.json";
import { fontClassNames } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = { title: `404 — ${en.NotFound.title}`, robots: { index: false } };

const BLOCKS = [
  { lang: "en", href: "/en", m: en.NotFound },
  { lang: "tr", href: "/tr", m: tr.NotFound },
] as const;

export default function GlobalNotFound() {
  return (
    <html lang="en" className={fontClassNames}>
      <body className="flex min-h-dvh flex-col bg-bg text-fg font-sans">
        <main className="flex flex-1 flex-col justify-center gap-12 px-4 py-16 md:px-6">
          <p className="font-mono text-sm uppercase tracking-wide text-muted">404</p>
          {BLOCKS.map(({ lang, href, m }, i) => {
            const Heading = i === 0 ? "h1" : "h2";
            return (
              <section key={lang} lang={lang}>
                <Heading className="font-display text-[clamp(2.5rem,8vw,6rem)] leading-none">{m.title}</Heading>
                <p className="mt-4 max-w-xl text-muted">{m.body}</p>
                <a href={href} className="mt-6 inline-flex min-h-11 items-center border border-line px-5 font-mono text-sm uppercase tracking-wide hover:border-fg">
                  {m.backHome} <span aria-hidden="true">&nbsp;→</span>
                </a>
              </section>
            );
          })}
        </main>
      </body>
    </html>
  );
}
```

No `ThemeScript` here on purpose: without it the `prefers-color-scheme` rules in `globals.css` decide, which is what the test pins. If the saved `theme` cookie should win as well, add `<ThemeScript />` in `<head>` and extend the test; decide by checking how `ThemeScript` reads the cookie (client-side only → safe to add).

- [ ] **Step 4: Localized page**

Rewrite `app/[locale]/not-found.tsx` to match the system (it currently uses a bare `p-6` block and a sub-44 px link):

```tsx
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <main className="flex min-h-[60svh] flex-col justify-center px-4 py-16 md:px-6">
      <p className="font-mono text-sm uppercase tracking-wide text-muted">404</p>
      <h1 className="mt-4 font-display text-[clamp(2.5rem,8vw,6rem)] leading-none">{t("title")}</h1>
      <p className="mt-4 max-w-xl text-muted">{t("body")}</p>
      <div className="mt-8">
        <Button href="/" variant="ghost">{t("backHome")} <span aria-hidden="true">→</span></Button>
      </div>
    </main>
  );
}
```

Mirror the same layout classes in `app/[locale]/error.tsx` (keep its retry button and logic).

If Step 1 showed the localized 404 is not in the server HTML (the known `cacheComponents` gap), find the cause with the docs and the build output and fix it so the Step 2 assertions pass. Candidates, in order: (a) the catch-all `app/[locale]/[...rest]/page.tsx` needs `generateStaticParams` returning `[]` plus the same `ensureStatic = "navigation"` the case page uses; (b) the not-found boundary is rendered under a Suspense boundary introduced by a client provider in the layout — move the boundary; (c) with `globalNotFound` on, unmatched locale paths can be routed to a localized variant. If none works within the task, keep the two `html` assertions (`toContain(heading)`, `lang`) as `test.fixme` with the exact observed behaviour in the title, and report BLOCKED-PARTIAL with evidence. Do not weaken the status-code assertions.

- [ ] **Step 5: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`. Update the `CLAUDE.md` "localized 404" constraint to describe the real behaviour after this task.

```bash
git add -A
git commit -m "feat(404): bilingual global not-found page; localized 404 in the site system"
```

---

### Task 5: LCP under budget; stricter Lighthouse gates

**Files:**
- Modify: whatever the measurements point to (candidates below), `lighthouserc.json`, `CLAUDE.md`
- Create: `docs/perf/2026-10-faz1-5-lcp.md` (measurement log)

**Interfaces:** none.

This task is measurement-led. Do not change code before Step 2 is written down.

- [ ] **Step 1: Baseline, three runs per URL**

`pnpm build && pnpm lhci`, then from `.lighthouseci/lhr-*.json` record per URL (median of 3 after temporarily setting `numberOfRuns: 3`): performance, FCP, LCP, TBT, CLS, Speed Index, the LCP element, and the LCP phase breakdown (`largest-contentful-paint-element` audit: TTFB, load delay, load time, render delay). Also record `render-blocking-resources`, `font-display`, `unused-css-rules`, `unused-javascript`, `bootup-time`, `mainthread-work-breakdown` top entries and the critical request chain. Write the table to `docs/perf/2026-10-faz1-5-lcp.md`.

- [ ] **Step 2: Name the cause before fixing**

For `/en` (LCP element: the hero `h1`, text): decide from the phase breakdown which of these dominates and write one paragraph of evidence:

| Symptom | Likely cause | Fix to try |
|---|---|---|
| Render delay ≫ load, FCP ≈ LCP | render-blocking stylesheet on a throttled connection | check CSS transfer size; remove unused `@font-face`/utilities; confirm one stylesheet |
| LCP ≫ FCP on a text node | LCP re-recorded at the font swap (Cabinet Grotesk) | make the fallback metric-compatible (`adjustFontFallback`/`size-adjust` so the swap does not produce a larger paint), or `display: "optional"` for the display font if the preload reliably wins |
| LCP ≫ FCP, element inside SplitReveal | the headline is re-painted when SplitText splits it after hydration | defer the split until after LCP is recorded (first `requestIdleCallback` after `load`), or skip the split when `performance.now()` is already past a threshold |
| Long TBT before LCP | hydration blocks paint | check what is in first-load JS; move non-critical client components behind `lazy` |
| LCP element is the shader poster, not the `h1` | poster painted late and larger | give the poster a smaller paint area or paint it with CSS in the first frame |

For case pages (LCP element: cover image): check the image is discoverable in the HTML with `fetchpriority="high"`, that the served width fits the simulated viewport (`sizes`), and the transfer size of the chosen candidate; consider a `<link rel="preload" as="image" imagesrcset>` for the hero only.

- [ ] **Step 3: Fix, one change at a time**

Apply the smallest fix for the named cause, rebuild, re-measure three runs, and append a row to the log (change → LCP before/after, CLS, perf). Keep a change only if LCP improves by more than run-to-run noise and no other gate regresses. Constraints: reduced-motion and no-JS behaviour unchanged; the hero headline stays in the server HTML; no font files added to first load; CLS ≤ 0.05; all existing e2e stay green (motion e2e in particular: `e2e/split.spec.ts`, `e2e/hero.spec.ts`, `e2e/motion.spec.ts`).

Stop when LCP ≤ 2.0 s (median) on `/en` and `/tr`, or when two consecutive attempts bring no measurable gain; in the second case report the remaining gap with the evidence instead of piling on speculative changes.

- [ ] **Step 4: Measure the contact page with the real widget**

Build once with Cloudflare's published always-pass test keys (`NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA`, set only in the shell for that build, never written to a file) and run Lighthouse against `/en/contact`: record CLS, script transfer and whether the widget or the late alert shifts layout. If CLS > 0.05, reserve the widget host's space (fixed `min-height` only while a challenge is visible is not enough — reserve from first paint) and re-measure. Rebuild without the key afterwards.

- [ ] **Step 5: Tighten the gates**

`lighthouserc.json`: `numberOfRuns: 3`; add `"aggregationMethod": "median-run"` to each assertion that supports it (or set it at the `assert` level); `largest-contentful-paint`: `["error", { "maxNumericValue": 2500 }]` if the measured median on every URL is ≤ 2.2 s, otherwise keep `warn` at 2000 and say why; add `/tr/work/geotrack` and `/en/services` to `collect.url`. Run `pnpm lhci` twice in a row: both must pass (a gate that flakes locally will flake in CI — loosen it to the level that passed both times and record the numbers).

- [ ] **Step 6: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e && pnpm lhci`. Update the `CLAUDE.md` LHCI lines (aggregation, runs, gates, new baseline) and remove statements that are no longer true.

```bash
git add -A
git commit -m "perf: LCP work on hero and case pages; median LHCI gates"
```

---

### Task 6: Accessibility: contrast, external links, axe on every page

**Files:**
- Create: `components/ui/ExternalLink.tsx`, `components/ui/ExternalLink.test.tsx`, `lib/contrast.ts`, `lib/contrast.test.ts`, `e2e/a11y.spec.ts`
- Modify: `app/globals.css` (light `--accent`), `lib/og/template.tsx` comment if the dark value is touched (it must not be), every hand-rolled new-tab link (`grep -rn 'target="_blank"' app components`), `package.json` (`@axe-core/playwright` dev dependency)

**Interfaces — Produces:**

```tsx
// components/ui/ExternalLink.tsx (server component)
export function ExternalLink(props: { href: string; newTabLabel: string; className?: string; arrow?: boolean; children: React.ReactNode }): React.JSX.Element;
// lib/contrast.ts
export function contrast(a: string, b: string): number; // WCAG ratio of two #rrggbb colours
```

- [ ] **Step 1: Contrast as a test**

`lib/contrast.test.ts` reads the token values straight from `app/globals.css`, so the stylesheet cannot drift from the rule:

```ts
// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { contrast } from "./contrast";

const css = readFileSync("app/globals.css", "utf8");
function tokens(block: RegExp) {
  const body = css.match(block)![1]!;
  return Object.fromEntries([...body.matchAll(/--(bg|surface|line|fg|muted|accent):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]])) as Record<"bg" | "surface" | "line" | "fg" | "muted" | "accent", string>;
}
const dark = tokens(/:root\s*\{([^}]+)\}/);
const light = tokens(/:root\[data-theme="light"\]\s*\{([^}]+)\}/);
const lightMedia = tokens(/prefers-color-scheme:\s*light\)\s*\{\s*:root:not\(\[data-theme="dark"\]\)\s*\{([^}]+)\}/);

describe("contrast()", () => {
  it("matches known WCAG values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });
});

describe.each([["dark", dark], ["light", light]] as const)("%s theme tokens", (_name, t) => {
  it("body text on background and surface ≥ 7:1", () => {
    expect(contrast(t.fg, t.bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(t.fg, t.surface)).toBeGreaterThanOrEqual(7);
  });
  it("muted text on background and surface ≥ 4.5:1", () => {
    expect(contrast(t.muted, t.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.muted, t.surface)).toBeGreaterThanOrEqual(4.5);
  });
  it("primary button: background-coloured text on accent ≥ 4.5:1", () => {
    expect(contrast(t.bg, t.accent)).toBeGreaterThanOrEqual(4.5);
  });
  it("accent as link/hover text on background ≥ 4.5:1", () => {
    expect(contrast(t.accent, t.bg)).toBeGreaterThanOrEqual(4.5);
  });
  it("form control border (muted) on background ≥ 3:1", () => {
    expect(contrast(t.muted, t.bg)).toBeGreaterThanOrEqual(3);
  });
});

it("the two light-theme blocks are identical", () => expect(lightMedia).toEqual(light));
```

`lib/contrast.ts`:

```ts
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}
```

Run: `pnpm vitest run lib/contrast.test.ts` — Expected: FAIL on the light "primary button" and "accent as text" cases (3.78:1), and possibly on dark-theme cases; list every failing pair in the report.

- [ ] **Step 2: Fix the tokens**

Light theme: darken `--accent` in **both** light blocks, keeping the hue (orange-red, h ≈ 18°) and lowering lightness until both accent tests pass with the smallest change (expected near `#c23a00`; compute, do not guess). Dark theme: if "background text on accent" fails for `#ff4d00` on `#0b0b0c`, do not change the brand colour — report the ratio; the dark primary button text is large mono uppercase at 14 px, which is not "large text", so if it is below 4.5:1 switch the primary button's text token in dark theme to the one that passes (`text-bg` vs `text-fg`) and pin it with a test of the rendered button colours in `e2e/a11y.spec.ts`. Any other failing pair: fix the token with the smallest change and note before/after values.

Screenshot the home hero, a case page, the contact form (idle + error) in light theme before and after; view them; the accent must still read as the same brand colour.

- [ ] **Step 3: One external-link component**

Test first (`components/ui/ExternalLink.test.tsx`): renders `<a target="_blank" rel="noreferrer noopener">`; accessible name is exactly `"GitHub (opens in a new tab)"` given `newTabLabel="opens in a new tab"`; the note is `sr-only` with no leading whitespace inside it; `arrow` adds an `aria-hidden` "↗"; `className` is merged; an `href` that is not `https:` or `mailto:` throws in development (`javascript:` cannot slip in from content).

```tsx
import { cn } from "@/lib/utils/cn";

type Props = { href: string; newTabLabel: string; className?: string; arrow?: boolean; children: React.ReactNode };

export function ExternalLink({ href, newTabLabel, className, arrow = false, children }: Props) {
  if (!/^https:\/\//.test(href)) throw new Error(`ExternalLink: only https URLs are allowed, got ${href}`);
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={cn("inline-flex min-h-11 items-center underline underline-offset-4", className)}>
      {/* One flex item, space in normal flow: whitespace inside the sr-only box may be dropped from the name. */}
      <span>
        {children}
        {arrow && <span aria-hidden="true">&nbsp;↗</span>}{" "}
        <span className="sr-only">({newTabLabel})</span>
      </span>
    </a>
  );
}
```

Replace every hand-rolled new-tab anchor (contact page, NowPanel, colophon, Footer, CaseAside, MDX `A` for external URLs, the LinkedIn link in the contact form's alert — there the rich-text renderer wraps `ExternalLink`). `mailto:` links stay plain anchors. Existing unit and e2e assertions on accessible names must keep passing unchanged; where a name changes, the new name must be "<label> (<newTab>)".

- [ ] **Step 4: axe on every page, both themes**

`pnpm add -D @axe-core/playwright`. Create `e2e/a11y.spec.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

const PAGES = ["/en", "/tr", "/en/work", "/en/work/geotrack", "/tr/work/karaoke-sync", "/en/about", "/tr/services", "/en/colophon", "/tr/contact", "/en/does-not-exist"];

for (const theme of ["dark", "light"] as const) {
  for (const path of PAGES) {
    test(`${path} has no WCAG A/AA violations (${theme})`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: "theme", value: theme, url: baseURL! }]);
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator("html")).toHaveAttribute("data-motion", /reduced|full/);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(" ")) }))).toEqual([]);
    });
  }
}

test("contact form in its error state has no violations", async ({ page }) => {
  await page.goto("/en/contact");
  await page.getByLabel("E-mail", { exact: true }).fill("nope");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator('[data-contact-status="error"]')).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
});

test("keyboard: every focusable element on the home page shows a focus indicator", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "hardware keyboard flow");
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("data-motion", /reduced|full/);
  const seen = new Set<string>();
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      return { key: el.outerHTML.slice(0, 80), outline: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2 };
    });
    if (!info) break;
    if (seen.has(info.key)) break;
    seen.add(info.key);
    expect(info.outline, info.key).toBe(true);
  }
  expect(seen.size).toBeGreaterThan(8);
});
```

Check how the theme is really applied (cookie name/value handled by `ThemeScript`) and adapt the cookie setup. Fix every violation in the code, not by excluding rules. If a rule must be excluded because the finding is a tool false positive, exclude that single rule on that single selector with a comment stating the evidence.

- [ ] **Step 5: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e && pnpm lhci`. Add to `CLAUDE.md`: contrast rules are enforced by `lib/contrast.test.ts` against `app/globals.css`; external links go through `ExternalLink`; `e2e/a11y.spec.ts` covers every page in both themes.

```bash
git add -A
git commit -m "fix(a11y): AA contrast in the light theme, one external-link component, axe on every page"
```

---

### Task 7: Security headers and contact hardening

**Files:**
- Create: `lib/security-headers.ts`, `lib/security-headers.test.ts`, `e2e/headers.spec.ts`
- Modify: `next.config.ts`, `lib/contact.ts`, `lib/contact.test.ts`, `lib/github.ts`, `lib/github.test.ts`, `lib/now.ts`, `.env.example`, `README.md`

**Interfaces — Produces:**

```ts
// lib/security-headers.ts
export function contentSecurityPolicy(opts: { dev: boolean }): string;
export function securityHeaders(opts: { dev: boolean }): { key: string; value: string }[];
// lib/contact.ts (additions)
export function createTurnstileVerifier(secret: string, fetchImpl: typeof fetch, allowedHostnames?: readonly string[]): …;
// env: TURNSTILE_HOSTNAMES (comma-separated, optional), GITHUB_TOKEN (optional, server only)
```

- [ ] **Step 1: Headers, test first**

`lib/security-headers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

const parse = (csp: string) => Object.fromEntries(csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => { const [k, ...v] = d.split(/\s+/); return [k, v]; }));

describe("contentSecurityPolicy", () => {
  const p = parse(contentSecurityPolicy({ dev: false }));
  it("locks down everything not needed", () => {
    expect(p["default-src"]).toEqual(["'self'"]);
    expect(p["object-src"]).toEqual(["'none'"]);
    expect(p["base-uri"]).toEqual(["'self'"]);
    expect(p["frame-ancestors"]).toEqual(["'none'"]);
    expect(p["form-action"]).toEqual(["'self'"]);
    expect(p).toHaveProperty("upgrade-insecure-requests");
  });
  it("allows exactly the third parties the site uses", () => {
    expect(p["script-src"]).toEqual(["'self'", "'unsafe-inline'", "https://challenges.cloudflare.com", "https://cloud.umami.is"]);
    expect(p["frame-src"]).toEqual(["https://challenges.cloudflare.com"]);
    expect(p["connect-src"]).toEqual(["'self'", "https://cloud.umami.is", "https://api-gateway.umami.dev"]);
    expect(p["img-src"]).toEqual(["'self'", "data:", "blob:"]);
    expect(p["font-src"]).toEqual(["'self'"]);
    expect(p["media-src"]).toEqual(["'self'"]);
    expect(p["style-src"]).toEqual(["'self'", "'unsafe-inline'"]);
  });
  it("never allows eval in production, and no wildcard sources", () => {
    const raw = contentSecurityPolicy({ dev: false });
    expect(raw).not.toContain("unsafe-eval");
    expect(raw).not.toMatch(/(^|\s)\*(\s|;|$)|https:(\s|;|$)/);
  });
  it("allows eval and websockets only in development", () => {
    const d = parse(contentSecurityPolicy({ dev: true }));
    expect(d["script-src"]).toContain("'unsafe-eval'");
    expect(d["connect-src"]).toContain("ws:");
    expect(d).not.toHaveProperty("upgrade-insecure-requests");
  });
});

describe("securityHeaders", () => {
  const h = Object.fromEntries(securityHeaders({ dev: false }).map((x) => [x.key, x.value]));
  it("sets the standard hardening headers", () => {
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["Permissions-Policy"]).toBe("camera=(), microphone=(), geolocation=(), browsing-topics=()");
    expect(h["Strict-Transport-Security"]).toBe("max-age=63072000; includeSubDomains; preload");
    expect(h["Content-Security-Policy"]).toBe(contentSecurityPolicy({ dev: false }));
  });
  it("omits HSTS in development", () => {
    expect(securityHeaders({ dev: true }).map((x) => x.key)).not.toContain("Strict-Transport-Security");
  });
});
```

Implement `lib/security-headers.ts` to satisfy the tests (a `Record<string, string[]>` of directives joined with `; `). Confirm the Umami collection endpoint the script really calls on the live site (network panel on `https://eminsportfolio.vercel.app` with the Browser tools: the request after `script.js` loads) and use that origin in `connect-src`; update the test's expected value to the observed origin(s) and say which you saw.

`next.config.ts`:

```ts
import { securityHeaders } from "./lib/security-headers";
// …
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders({ dev: process.env.NODE_ENV !== "production" }) }];
  },
```

`'unsafe-inline'` for scripts is deliberate (decision 4): Next's inline bootstrap and `ThemeScript` need it without nonces. Say so in a comment above the directive.

- [ ] **Step 2: Headers in the browser**

`e2e/headers.spec.ts`: for `/en`, `/tr/contact`, `/en/work/geotrack`, `/sitemap.xml`: response carries `content-security-policy`, `x-content-type-options: nosniff`, `x-frame-options: DENY`. Then, for every page in the a11y list, load it with a console listener and assert **zero** messages matching `/Content Security Policy|Refused to (load|execute|apply|connect|frame)/` after `data-motion` is set — including after clicking the theme toggle, opening `/en/work?f=ai`, playing/pausing the karaoke video and submitting the contact form (dry run). A CSP that breaks the shader (blob workers), fonts, the video or view transitions must fail here.

Manual check with Cloudflare's always-pass test site key (shell env for one build only): the Turnstile iframe loads and a token input appears with the CSP active; report.

- [ ] **Step 3: Turnstile hostname check**

Tests first in `lib/contact.test.ts`: verifier built with `["eminsportfolio.vercel.app"]` → `ok` when siteverify returns `{ success: true, hostname: "eminsportfolio.vercel.app" }`; `{ ok: false, reason: "hostname" }` for another hostname or a missing one; without an allow-list the hostname is ignored (current behaviour); comparison is case-insensitive; `contactDepsFrom` reads `TURNSTILE_HOSTNAMES` (comma-separated, trimmed, empty → no check). Then implement. A token minted for another site with the same secret can no longer be replayed here.

- [ ] **Step 4: Optional GitHub token**

Tests first in `lib/github.test.ts`: `fetchNowStats(user, fetchImpl, now, token)` sends `Authorization: Bearer <token>` on both requests when a token is given and no `Authorization` header otherwise; a token never appears in a thrown error or a log. `lib/now.ts` passes `process.env.GITHUB_TOKEN` (server only, read inside the cached function). `.env.example` and README: a fine-grained token with **no** permissions (public data only) lifts the unauthenticated rate limit Vercel's shared build IPs often hit; optional.

- [ ] **Step 5: Verify and commit**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e && pnpm lhci`. Grep the client chunks again for secret names and `GITHUB_TOKEN` (must be absent). Add the headers, hostname check and token to `CLAUDE.md` and the README "Configuration" table (`TURNSTILE_HOSTNAMES`, `GITHUB_TOKEN`: Production only).

```bash
git add -A
git commit -m "feat(security): static security headers with CSP; Turnstile hostname check; optional GitHub token"
```

---

## Owner steps

1. **Now (optional):** Vercel → Production: `TURNSTILE_HOSTNAMES=eminsportfolio.vercel.app`; `GITHUB_TOKEN` (fine-grained, no permissions). Redeploy.
2. **Search engines:** after merge, add the site in Google Search Console and submit `https://eminsportfolio.vercel.app/sitemap.xml`.
3. **When the domain is bought** (`emindundar.dev`), in this order: connect it in Vercel (plus `www` redirect) → `NEXT_PUBLIC_SITE_URL=https://emindundar.dev` → Turnstile widget hostname + `TURNSTILE_HOSTNAMES` → Umami website domain + `NEXT_PUBLIC_UMAMI_DOMAINS` → verify the domain in Resend, `CONTACT_FROM=Portfolio <contact@emindundar.dev>` → redeploy → resubmit the sitemap on the new host → send one test message.
4. **Still open from earlier phases:** portrait photo (`media-src/about/portrait.jpg`, then `pnpm media`); confirmation of the softened CV claims.

## Self-review notes

- Spec §4.6: metadata/canonical → Task 1; JSON-LD Person + CreativeWork → Task 2; `opengraph-image` per locale and slug → Task 3; sitemap/robots → Task 1; analytics already shipped (Faz 1c). §4.7 LCP → Task 5. §4.8 contrast, keyboard, focus → Task 6. §4.9 localized `not-found` in the same aesthetic → Task 4. §4.10 Lighthouse thresholds → Task 5. §5.2 phase 1.5 "domain" → owner steps (cannot be done in code).
- Deferred items from the Faz 1b/1c reviews: light-theme button contrast → Task 6; CLS with the live widget → Task 5 Step 4; optional `GITHUB_TOKEN`, siteverify hostname, CSP → Task 7; unified new-tab markup → Task 6; LHCI median + 3 runs → Task 5; localized 404 → Task 4.
- Not in this phase: terminal mode and blog (Faz 2), AI assistant and shared rate-limit store (Faz 3).
- Review Focus mapping: 1 → Task 1 Step 5 + Task 3 Step 4; 2 → Task 1 Steps 4–5; 3 → Task 4 Step 2; 4 → Task 2 Step 1 (`serializeLd`) + component test; 5 → Task 6 Step 4.
