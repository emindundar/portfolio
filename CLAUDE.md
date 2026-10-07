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
  toggles and forms are `"use client"`. ESLint blocks gsap/lenis/ogl/motion imports elsewhere.
- Tokens only: bg, surface, line, fg, muted, accent (see app/globals.css). No arbitrary colors. No border-radius. No shadows.
- Fonts: font-display (Cabinet Grotesk), font-sans (Satoshi), font-mono (JetBrains Mono) via lib/fonts.ts.
- Content: add a project = `content/projects/<slug>.meta.json` + `<slug>.en.mdx` + `<slug>.tr.mdx`. Schema in content/schema.ts.
  Missing tr falls back to en with a build warning. Invalid facet or >3 facets fails the build.
- Theme: `data-theme` on <html>, cookie `theme`, set before hydration by components/layout/ThemeScript.tsx. Never read cookies() in layouts (keeps pages static).
- Performance budget: first-load JS ≤ 180 KB gz, LCP < 2.0 s, CLS < 0.05. Lazy-load anything animation/WebGL.
- Reduced motion: every animation goes through gsap.matchMedia() (Faz 1) — static fallback required.
- Tests: unit for lib/* and content schema; e2e for routing/theme/content. Add a test with every behavior change.
- UI/UX work: the globally installed `ui-ux-pro-max` skill is the first stop for design-system questions (styles, palettes, font pairs).
  Its output never overrides the spec tokens in app/globals.css. Use `21st-ui-review` (if installed) for UI review, not `21st-ui-build`.

## Lenis + GSAP bridge (Faz 1, lib/motion.ts)
lenis autoRaf:false; gsap.ticker.add(t => lenis.raf(t*1000)); lenis.on('scroll', ScrollTrigger.update); gsap.ticker.lagSmoothing(0)

## Learned constraints
- Tailwind v4 is wired via `turbopack.rules["*.css"]` with `@tailwindcss/turbopack` in `next.config.ts`; there is no postcss.config. Never add one.
- `cacheComponents: true`: `new Date()`/`fetch`/cookies in render make the build fail (`blocking-prerender-current-time`). Compute build-time constants at module scope (see `components/layout/Footer.tsx`); never call `cookies()` in layouts.
- Under cacheComponents the localized 404 is client-rendered (server sends a 404 shell). Known gap; do not add assertions on 404 `<html lang>`. Revisit in Faz 1.5 with a bilingual `global-not-found`.
- Theme toggle accessible name is `"<Theme>: <Light|Dark>"` (WCAG 2.5.3); tests select it with `/theme/i`.
- Playwright: Accept-Language must be set via `page.route` (context locale overrides `extraHTTPHeaders`); see `e2e/i18n.spec.ts`. Run `pnpm build` before `pnpm e2e`.
- Vitest: `resolve.tsconfigPaths: true` (no vite-tsconfig-paths plugin); tests importing `velite` need `// @vitest-environment node`.
- Velite outputs `.velite/projectMeta.json` / `projectContent.json`; import via `#site/content` only from `lib/content/index.ts`.
- `npm-run-all2` pinned `^8` (v9 needs Node ≥ 24.15). React renders `hrefLang` camelCase; grep case-insensitively.
- LHCI: default optimistic aggregation, 2 runs (lenient for Faz 0); tighten to `median-run` + 3 runs in Faz 1.5.
- LHCI gates: `resource-summary:script:size` ≤ 256 KB (error, total transfer incl. lazy chunks), LCP ≤ 2.0 s (warn). Faz 0 baseline: script 157 KB, simulated-mobile LCP 2.3–2.8 s (warns; text-only page, revisit in Faz 1.5).
- Local ports: Playwright uses 3100, LHCI 3101 (both `next start`), so a stray dev server on 3000 never gets measured.
- Motion lives in components/motion, components/canvas, lib/motion.ts only. Single rAF: Lenis autoRaf:false driven by gsap.ticker; ScrollTrigger.update on lenis scroll.
- useReducedMotion() returns true on the server: SSR HTML is always the static variant; motion mounts only on the client after the query says "no-preference".
- SplitText only on the hero headline (aria:"auto", revert on unmount). HeroShader is dynamic/ssr:false, paused when offscreen or tab hidden, poster under reduced-motion or no WebGL.
- LHCI script gate is 256 KB total transfer (Lighthouse counts lazy chunks); spec's 180 KB applies to first-load JS. Current baseline: 229 KB total script on /en (234303 B); first-load JS 153.6 KB gz (budget 180 KB), gsap/lenis/ogl load after hydration.
- Motion components are thin wrappers (SSR = static markup) over `*.impl.tsx` loaded lazily after hydration; `lib/motion.ts` is imported only by impl files, SmoothScroll and Cursor — keeps gsap/lenis out of first-load JS. The wrappers always render the real element (never swap it for a Suspense fallback, which would drop focus); the lazy impl is effect-only and receives the element. `REDUCED_MOTION_QUERY` lives in `useReducedMotion.ts`, not `lib/motion.ts`.
