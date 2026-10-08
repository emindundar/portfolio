# emindundar.dev

Personal portfolio of Emin Dündar. Next.js 16, TypeScript, Tailwind v4, next-intl (EN/TR), Velite MDX content.

## Develop
pnpm install
pnpm dev

## Verify
pnpm lint && pnpm typecheck && pnpm test
pnpm build && pnpm e2e && pnpm lhci

## Pages
`/` home, `/work` (filterable list), `/work/[slug]` case studies, `/about`, `/services`, `/contact`, `/colophon`, `/[locale]/cv` (redirect to the PDF). All under `/en` and `/tr`.

## Add a project
1. `content/projects/<slug>.meta.json`: `slug`, `facets` (1-3 from `content/facet-list.ts`), `stack`, `year`, `role`, `order`, optional `featured`, `cover`, `gallery`, `client` and `credits` (both `{ "en": …, "tr": … }`), `links`. Schema: `content/schema.ts`.
2. `content/projects/<slug>.en.mdx` and `<slug>.tr.mdx`, each with the five fixed `##` headings, 180-350 words, one `<FlowDiagram label="…" steps={[…]} />` (3-6 steps) in the Architecture/Mimari section, claims verifiable in the repo.
3. Optional media in `media-src/<slug>/`, then `pnpm media` (writes `public/media/` and `lib/media-manifest.json`). Blur or crop e-mails, QR codes and third-party faces in the source.
4. `pnpm test` (content integrity test) and `pnpm build`.

## Configuration

All variables are optional. Copy `.env.example` to `.env.local`.

| Variable | Used by | Without it | Vercel environment |
|---|---|---|---|
| `RESEND_API_KEY`, `CONTACT_TO` | contact form mail | form answers "not available", points to LinkedIn | Production only |
| `CONTACT_FROM` | sender address | `Portfolio <onboarding@resend.dev>` | Production only |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | bot check (both are needed) | form answers "not available" | Production only |
| `CONTACT_DRY_RUN=1` | local work, e2e, previews: validates, answers success, sends nothing | — (ignored when `VERCEL_ENV=production`) | Preview only |
| `NEXT_PUBLIC_UMAMI_ID` | analytics | no analytics script | Production only |
| `NEXT_PUBLIC_UMAMI_DOMAINS` | comma-separated hostnames allowed to report | attribute omitted, every host reports | Production only |

- Real keys go into **Production only**. Preview deployments run on other hostnames, where the Turnstile widget is not authorised: give Preview nothing but `CONTACT_DRY_RUN=1`.
- While `CONTACT_FROM` is the default, `CONTACT_TO` must be the Resend account's own e-mail address; Resend rejects any other recipient (403).
- `NEXT_PUBLIC_*` values are baked in at build time. After adding or changing one, trigger a new deployment; a running deployment does not pick it up.
- After configuring, send one message on the production URL and check that it arrives with the visitor as reply-to. On failure search the Vercel logs for `contact:`; the line carries the missing variable, the Cloudflare error code or the provider's HTTP status (never visitor data).
- Limits: 5 messages per hour per client (IPv4 address or IPv6 /64) and 30 per hour in total, per server instance.

Data flows: a submitted name, e-mail address and message are sent as an e-mail through Resend and stored nowhere else; Cloudflare Turnstile runs the bot check and receives the visitor's IP address. The form says so under the submit button. Analytics, when enabled, is Umami Cloud: no cookies, no personal data, Do Not Track respected, so there is no consent banner.

The home page "now" panel reads `content/now.json` (edit the text and the `updated` date by hand) and, once an hour, two unauthenticated GitHub API endpoints. If GitHub does not answer, only the hand-written line is shown.

Design specs and plans live in `docs/superpowers/`.
