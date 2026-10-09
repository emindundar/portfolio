# emindundar.dev — portfolio

Spec: docs/superpowers/specs/2026-10-07-portfolio-design.md
Plans: docs/superpowers/plans/

## Stack
Next.js 16 App Router (Turbopack, cacheComponents), React 19, TS strict, pnpm, Tailwind v4 (@theme in app/globals.css),
next-intl (`app/[locale]`, proxy.ts), Velite (content/ → .velite, import from `#site/content`), Vitest, Playwright, LHCI.

## Commands
pnpm dev · pnpm build · pnpm lint · pnpm typecheck · pnpm test · pnpm e2e (needs `pnpm build` first) · pnpm lhci

## Rules
- Locales: en (default), tr. Every user-facing string goes through messages/{en,tr}.json. No hardcoded UI text.
- Pages and layouts are server components. Only `components/motion`, `components/canvas`, `components/terminal`,
  toggles, forms (`components/contact/*`, incl. the Turnstile widget), `components/layout/NavLinks` (usePathname) and `components/media/VideoCover` are `"use client"`. ESLint blocks gsap/lenis/ogl/motion imports elsewhere.
- Tokens only: bg, surface, line, fg, muted, accent (see app/globals.css). No arbitrary colors. No border-radius. No shadows.
- Fonts: font-display (Cabinet Grotesk), font-sans (Satoshi), font-mono (JetBrains Mono) via lib/fonts.ts.
- Content: add a project = `content/projects/<slug>.meta.json` + `<slug>.en.mdx` + `<slug>.tr.mdx`. Schema in content/schema.ts (optional: `cover` {type,src,frame}, `gallery` [{src,alt{en,tr}}], `client` {en,tr}, `credits` {en,tr}, `links.live`).
  Missing tr falls back to en with a build warning. Invalid facet or >3 facets fails the build.
- Theme: `data-theme` on <html>, cookie `theme`, set before hydration by components/layout/ThemeScript.tsx. Never read cookies() in layouts (keeps pages static).
- Performance budget: first-load JS ≤ 180 KB gz, LCP < 2.0 s, CLS < 0.05. Lazy-load anything animation/WebGL.
- Reduced motion: every animation is gated by useReducedMotion(); impls mount only when motion is allowed — static fallback required.
- Tests: unit for lib/* and content schema; e2e for routing/theme/content. Add a test with every behavior change.
- UI/UX work: the globally installed `ui-ux-pro-max` skill is the first stop for design-system questions (styles, palettes, font pairs).
  Its output never overrides the spec tokens in app/globals.css. Use `21st-ui-review` (if installed) for UI review, not `21st-ui-build`.

## Lenis + GSAP bridge (Faz 1, components/motion/SmoothScroll.tsx → ScrollBridge)
lenis autoRaf:false; gsap.ticker.add(t => lenis.raf(t*1000)); lenis.on('scroll', ScrollTrigger.update); gsap.ticker.lagSmoothing(0)

## Learned constraints
- Tailwind v4 is wired via `turbopack.rules["*.css"]` with `@tailwindcss/turbopack` in `next.config.ts`; there is no postcss.config. Never add one.
- `cacheComponents: true`: `new Date()`/`fetch`/cookies in render make the build fail (`blocking-prerender-current-time`). Compute build-time constants at module scope (see `components/layout/Footer.tsx`); never call `cookies()` in layouts.
- Under cacheComponents the localized 404 is client-rendered (server sends a 404 shell). Known gap; do not add assertions on 404 `<html lang>`. Revisit in Faz 1.5 with a bilingual `global-not-found`.
- Theme toggle accessible name is `"<Theme>: <Light|Dark>"` (WCAG 2.5.3); tests select it with `/theme/i`.
- Playwright: Accept-Language must be set via `page.route` (context locale overrides `extraHTTPHeaders`); see `e2e/i18n.spec.ts`. Run `pnpm build` before `pnpm e2e`.
- Vitest: `resolve.tsconfigPaths: true` (no vite-tsconfig-paths plugin); tests importing `velite` need `// @vitest-environment node`.
- Velite outputs `.velite/projectMeta.json` / `projectContent.json`; `#site/content` is imported only from `lib/content/index.ts` and `lib/content/site.ts`.
- `npm-run-all2` pinned `^8` (v9 needs Node ≥ 24.15). React renders `hrefLang` camelCase; grep case-insensitively.
- LHCI: default optimistic aggregation, 2 runs (lenient for Faz 0); tighten to `median-run` + 3 runs in Faz 1.5.
- LHCI gates: `resource-summary:script:size` ≤ 256 KB (error, total transfer incl. lazy chunks), LCP ≤ 2.0 s (warn), `cumulative-layout-shift` ≤ 0.05 (error, every URL). Faz 0 baseline: script 157 KB, simulated-mobile LCP 2.3–2.8 s (warns; text-only page, revisit in Faz 1.5).
- Local ports: Playwright uses 3100, LHCI 3101 (both `next start`), so a stray dev server on 3000 never gets measured.
- Motion lives in components/motion, components/canvas, lib/motion.ts only. Single rAF for Lenis/GSAP: Lenis autoRaf:false driven by gsap.ticker; ScrollTrigger.update on lenis scroll. HeroShader runs its own visibility-gated rAF (`data-running` on its host).
- useReducedMotion() returns true on the server: SSR HTML is always the static variant; motion mounts only on the client after the query says "no-preference".
- SplitText only on the hero headline (aria:"auto", revert on unmount). HeroShader is dynamic/ssr:false, paused when offscreen or tab hidden, poster under reduced-motion or no WebGL.
- LHCI script gate is 256 KB total transfer (Lighthouse counts lazy chunks); spec's 180 KB applies to first-load JS. Current baseline: 229 KB total script on /en (234303 B); first-load JS 153.6 KB gz (budget 180 KB), gsap/lenis/ogl load after hydration.
- Motion components are thin wrappers (SSR = static markup) over `*.impl.tsx` loaded lazily after hydration; `lib/motion.ts` is imported only by impl files, SmoothScroll and Cursor — keeps gsap/lenis out of first-load JS. The wrappers always render the real element (never swap it for a Suspense fallback, which would drop focus); the lazy impl is effect-only and receives the element. `REDUCED_MOTION_QUERY` lives in `useReducedMotion.ts`, not `lib/motion.ts`.
- Every `lazy()`/`dynamic()` import of motion/WebGL code catches load failure and renders nothing (HeroShader → `FailedShader` → poster). `app/[locale]/error.tsx` is the localized boundary; MotionProvider sits in the layout, above it.
- Decision signals for tests: `<html data-motion="reduced|full">` (MotionProvider, absent in SSR HTML) and `body[data-cursor="custom|native"]` (Cursor). e2e waits on these, never on fixed sleeps.
- WebGL on software renderers (SwiftShader/llvmpipe — e.g. GitHub runners, GPU-less VMs) counts as unsupported: HeroShader is replaced by the poster (`probeWebGL`/`isSoftwareRenderer` in `components/canvas/visibility.ts`). CI e2e/LHCI therefore exercise the poster path; the shader path is verified locally with `PLAYWRIGHT_HARDWARE_GL=1`. Reason: software GL made every frame a long task (TBT 4 s). e2e gates on `hasGL` via `e2e/helpers/gl.ts` (keep its regex identical); headless Chromium is software GL by default (poster path, like CI); `PLAYWRIGHT_HARDWARE_GL=1 pnpm e2e` (macOS/Metal) runs the real shader path locally.
- Media: `pnpm media` turns `media-src/<slug>/` into `public/media/<slug>/` (webp/video) + `lib/media-manifest.json`. Never `next/image`; `imageFor`/`videoFor` are manifest-driven. Privacy: crop/blur e-mails, QR codes and third-party faces in the SOURCE file, not via CSS.
- `/work` reads `searchParams` only inside a `<Suspense>` (PPR under cacheComponents); a `<noscript><style>` reveals the streamed list without JS (guarded by e2e "no JS"). Flip reorder state is captured on chip click/popstate in `WorkFlip`; `data-work-ready` marks a settled list.
- Case pages: `ensureStatic = "navigation"` (unknown slug is a real 404); cover uses `ViewTransition name="cover-<slug>"` shared with the list row.
- Content rules: exactly five fixed `##` headings per language, 180-350 words of prose (front matter, headings and the `<FlowDiagram … />` element are not counted), exactly one `<FlowDiagram label steps={[…]} />` of 3-6 steps inside the Architecture/Mimari section with the same step count in en and tr (`content/projects.test.ts`), every claim verifiable in the repo. `client` and `credits` are `{en,tr}` and `CaseAside` picks `project.locale`. `/[locale]/cv` is a static 302 with a relative `Location`.
- Nav: Home link is hidden below `md` (brand links home); TR nav fits 360px (4 links, last right edge 316px). Footer gutters `px-4 md:px-6`.
- LHCI URLs: /en, /tr, /en/work, /en/work/geotrack, /en/work/karaoke-sync, /en/about, /en/contact. Faz 1c baseline (perf / CLS / script transfer in KiB, analytics off): /en 94-95 / 0.012 / 245, /tr 95 / 0.012 / 245, /work 97 / 0.005 / 232, geotrack 92-94 / 0 / 229, karaoke-sync 94 / 0 / 229, /about 94-97 / 0.001 / 229, /contact 95-98 / 0 / 228; a11y 100, SEO 100 everywhere. With `NEXT_PUBLIC_UMAMI_ID` set the script transfer grows by about 3.4 KiB per page (all gates still pass). /en/contact is measured without a site key (no Cloudflare script, no widget). Simulated LCP is bimodal on localhost (about 2.4 s or 2.9-3.3 s for the same build; warn only).
- Mono font: `JetBrains_Mono` has `adjustFontFallback: false` AND an explicit `fallback` list (`ui-monospace, SFMono-Regular, Menlo, monospace`). The generated Arial fallback (size-adjust 134.59 %) is ~50 % wider for uppercase mono text and re-wrapped the /work chip row at the swap (CLS 0.138). Turbopack ignores `adjustFontFallback: false` alone; check the built CSS for `JetBrains Mono Fallback` after touching `lib/fonts.ts`.
- Case hero: `MediaCover kind="hero"` is passed `priority` (image cover and video poster are `loading="eager"` + `fetchpriority="high"`; the cover, not the `<h1>`, is the LCP candidate on mobile). Hero image `alt=""` and hero `TypoCover` `aria-hidden` (the header above carries title, year, facets); hero `sizes` depends on the frame. List, gallery and event images stay lazy; event images have `alt=""` (figcaption carries the title).
- `VideoCover`: the poster `<img>` is always rendered (SSR, reduced motion, motion) and never swapped; with motion a `<video>` without `poster` is overlaid 1px inside it (a same-size first frame became a later LCP candidate and dropped perf to 88) plus a pause/play button (WCAG 2.2.2; `Case.videoPause`/`Case.videoPlay` passed as props via `MediaCover videoLabels`, required for `kind="hero"`). The visibility controller never resumes a user-paused video (`data-paused`). MP4 is listed before WebM (smaller file). Reduced motion: poster only, no button. List rows never render a video.
- Dates: `formatRange(from, to, locale, present)` takes the ongoing label from messages (`About.present`: "Present" / "Günümüz"); `lib/format.ts` holds no UI strings. The TR name of `/colophon` is "Künye" (nav, footer, page title).
- Nav below `md`: the scrolling `<nav>` has `py-1 -my-1` so the 2px + 2px focus ring is not clipped by `overflow-x-auto` (header height stays 97px).
- Contact: all logic in `lib/contact.ts` (pure, injected deps); `app/[locale]/contact/actions.ts` only calls `contactDepsFrom(env, getHeader, shared)`. Order: honeypot (field `contact_ref`) → zod → configured? (Resend key, `CONTACT_TO`, Turnstile secret AND `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) → unknown client IP fails closed → rate limit (5/h per `rateKey`: IPv4 address or IPv6 /64, in-memory) → Turnstile → global fuse (30 sends/h per instance, answers `unavailable`) → Resend (REST via fetch, no SDK). Verifier/sender return `Outcome {ok, reason}`; logs carry HTTP status / Cloudflare error codes only, never personal data. Validation runs before Turnstile because tokens are single-use. Fails closed (`unavailable`) when secrets are missing; `CONTACT_DRY_RUN=1` (set by Playwright's webServer) skips verify + send only, and is ignored when `VERCEL_ENV=production`.
- Client components import `lib/contact` type-only (zod stays out of the client bundle); budgets and the honeypot field name come in as props from the page.
- Contact e2e: each test sends its own `x-forwarded-for` so the shared in-memory limiter never collides; hooks `form[data-contact-form]`, `[data-contact-status]`.
- Now panel: `lib/now.ts` is the only `"use cache"` function (`cacheLife("hours")`); `lib/github.ts` returns null on any failure and the panel then shows only `content/now.json`. Hooks `[data-now]`, `[data-now-live]` (may be absent; builds without GitHub access are valid).
- Analytics: `components/layout/Analytics.tsx` renders the Umami script only when `NEXT_PUBLIC_UMAMI_ID` is set; CI and LHCI run without it. Optional `NEXT_PUBLIC_UMAMI_DOMAINS` (comma-separated hostnames) becomes `data-domains`; omitted when unset. The shared "opens in a new tab" label is `Common.newTab`.
- `NEXT_PUBLIC_*` and other build-time env is read at module scope, never inside a page/layout render.
