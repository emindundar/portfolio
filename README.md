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
| `NEXT_PUBLIC_SITE_URL` | canonical, hreflang, sitemap, robots, Open Graph and JSON-LD origin (build time) | `https://$VERCEL_PROJECT_PRODUCTION_URL` (Vercel picks the shortest production custom domain), else `http://localhost:3000` | Production (any environment is fine; previews also use the production host) |
| `RESEND_API_KEY`, `CONTACT_TO` | contact form mail | form answers "not available", points to LinkedIn | Production only |
| `CONTACT_FROM` | sender address | `Portfolio <onboarding@resend.dev>` | Production only |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | bot check (both are needed) | form answers "not available" | Production only |
| `TURNSTILE_HOSTNAMES` | comma-separated hostnames a Turnstile token must come from (e.g. `eminsportfolio.vercel.app`), server only; a rejected host is logged as `contact: turnstile rejected (hostname:<host>)` | hostname not checked | Production only |
| `CONTACT_DRY_RUN=1` | local work, e2e, previews: validates, answers success, sends nothing | — (ignored when `VERCEL_ENV=production`) | Preview only |
| `NEXT_PUBLIC_UMAMI_ID` | analytics | no analytics script | Production only |
| `NEXT_PUBLIC_UMAMI_DOMAINS` | comma-separated hostnames allowed to report | attribute omitted, every host reports | Production only |
| `GITHUB_TOKEN` | "now" panel GitHub requests, server only: a fine-grained token with **no** permissions (public data only) | unauthenticated requests (Vercel's shared build IPs often hit that rate limit; the panel then shows only the hand-written line) | Production only |

- `GITHUB_TOKEN`: fine-grained tokens expire (at most one year). An expired or revoked token makes every GitHub request answer 401 and the live line disappears silently (it does not fall back to unauthenticated requests). Note the expiry date and rotate it before then; if the GitHub line is missing, check the token first.

- Real keys go into **Production only**. Preview deployments run on other hostnames, where the Turnstile widget is not authorised: give Preview nothing but `CONTACT_DRY_RUN=1`.
- While `CONTACT_FROM` is the default, `CONTACT_TO` must be the Resend account's own e-mail address; Resend rejects any other recipient (403).
- `NEXT_PUBLIC_*` values are baked in at build time. After adding or changing one, trigger a new deployment; a running deployment does not pick it up.
- After configuring, send one message on the production URL and check that it arrives with the visitor as reply-to. On failure search the Vercel logs for `contact:`; the line carries the missing variable, the Cloudflare error code or the provider's HTTP status (never visitor data).
- Limits: 5 messages per hour per client (IPv4 address or IPv6 /64) and 30 per hour in total, per server instance.

Data flows: a submitted name, e-mail address and message are sent as an e-mail through Resend and stored nowhere else; Cloudflare Turnstile runs the bot check and receives the visitor's IP address. The form says so under the submit button. The site itself sets two first-party cookies: `theme` (when the theme toggle is used) and `NEXT_LOCALE` (language choice, set by next-intl). Analytics, when enabled, is Umami Cloud: no cookies, no personal data, Do Not Track respected, so there is no consent banner.

The home page "now" panel reads `content/now.json` (edit the text and the `updated` date by hand) and, once an hour, two public GitHub API endpoints (authenticated with `GITHUB_TOKEN` when set). If GitHub does not answer, only the hand-written line is shown.

Security headers are static and set in `next.config.ts` (`lib/security-headers.ts`) for every path except the hashed build assets under `/_next/static/` (those get `nosniff` only): a Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, `nosniff`, a referrer policy and a permissions policy. The CSP allows only Cloudflare Turnstile (script and frame) and Umami (script `cloud.umami.is`, collection `gateway.umami.is`) besides the site itself. Known limitation: scripts and styles may run inline (`'unsafe-inline'`) because a per-request nonce would make every page dynamic; origins, framing, forms and plugins stay locked down. A new third-party script, frame or endpoint needs an entry there (`e2e/headers.spec.ts` fails on any CSP violation). The Vercel preview toolbar (`vercel.live`) is not allowed, so it does not load on preview deployments.

## Launch / domain change

Owner steps (from the Faz 1.5 plan), in order:

1. Vercel → Production: `TURNSTILE_HOSTNAMES=eminsportfolio.vercel.app`; `GITHUB_TOKEN` (fine-grained, no permissions, note its expiry). Redeploy.
2. Search engines: add the site in Google Search Console and submit `https://eminsportfolio.vercel.app/sitemap.xml`.
3. When the domain (`emindundar.dev`) is bought, in this order: connect it in Vercel (plus the `www` redirect) → `NEXT_PUBLIC_SITE_URL=https://emindundar.dev` → Turnstile widget hostname list and `TURNSTILE_HOSTNAMES` → Umami website domain and `NEXT_PUBLIC_UMAMI_DOMAINS` → verify the domain in Resend, `CONTACT_FROM=Portfolio <contact@emindundar.dev>` → redeploy → resubmit the sitemap on the new host → send one test message. Keep **both** `emindundar.dev` and `eminsportfolio.vercel.app` in `TURNSTILE_HOSTNAMES` and in the widget's hostname list until the vercel.app host redirects to the new domain.

### Post-deploy check (after every production deploy that touches headers, analytics or the form)

1. DevTools console on `/en`: no `Content Security Policy` errors.
2. DevTools Network on `/en`: `gateway.umami.is/api/send` answers 2xx (only when `NEXT_PUBLIC_UMAMI_ID` is set and the host is in `NEXT_PUBLIC_UMAMI_DOMAINS`).
3. On `/en/contact`: nothing from `challenges.cloudflare.com` at load; focus a field and the Turnstile widget appears; still no CSP errors in the console.

Design specs and plans live in `docs/superpowers/`.
