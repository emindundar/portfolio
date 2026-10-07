# emindundar.dev

Personal portfolio of Emin Dündar. Next.js 16, TypeScript, Tailwind v4, next-intl (EN/TR), Velite MDX content.

## Develop
pnpm install
pnpm dev

## Verify
pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm e2e && pnpm lhci

## Add a project
Create `content/projects/<slug>.meta.json`, `<slug>.en.mdx`, `<slug>.tr.mdx`. See `content/schema.ts`.

Design spec and plans live in `docs/superpowers/`.
