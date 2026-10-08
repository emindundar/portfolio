# emindundar.dev

Personal portfolio of Emin Dündar. Next.js 16, TypeScript, Tailwind v4, next-intl (EN/TR), Velite MDX content.

## Develop
pnpm install
pnpm dev

## Verify
pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm e2e && pnpm lhci

## Pages
`/` home, `/work` (filterable list), `/work/[slug]` case studies, `/about`, `/services`, `/colophon`, `/[locale]/cv` (redirect to the PDF). All under `/en` and `/tr`.

## Add a project
1. `content/projects/<slug>.meta.json`: `slug`, `facets` (1-3 from `content/facet-list.ts`), `stack`, `year`, `role`, `order`, optional `featured`, `cover`, `gallery`, `client`, `credits`, `links`. Schema: `content/schema.ts`.
2. `content/projects/<slug>.en.mdx` and `<slug>.tr.mdx`, each with the five fixed `##` headings, 180-350 words, claims verifiable in the repo.
3. Optional media in `media-src/<slug>/`, then `pnpm media` (writes `public/media/` and `lib/media-manifest.json`). Blur or crop e-mails, QR codes and third-party faces in the source.
4. `pnpm test` (content integrity test) and `pnpm build`.

Design specs and plans live in `docs/superpowers/`.
