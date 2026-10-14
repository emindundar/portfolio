/**
 * Static security headers, applied to every path from next.config.ts. Static on purpose: a per-request
 * nonce would force every page to render dynamically and give up the prerendered pages and the
 * performance budget (plan Faz 1.5, decision 4).
 */
type Directives = Record<string, string[]>;

const TURNSTILE = "https://challenges.cloudflare.com";
const UMAMI_SCRIPT = "https://cloud.umami.is";
// cloud.umami.is/script.js sends events to `${data-host-url ?? "https://gateway.umami.is"}/api/send`;
// components/layout/Analytics.tsx pins data-host-url to this value.
export const UMAMI_COLLECT = "https://gateway.umami.is";

export function contentSecurityPolicy({ dev }: { dev: boolean }): string {
  const directives: Directives = {
    "default-src": ["'self'"],
    // 'unsafe-inline' is a known, accepted limitation (decision 4): Next's inline bootstrap/RSC payload
    // scripts and ThemeScript (sets data-theme before paint) need it, and nonces would make every page dynamic.
    // Origins, framing, forms and plugins stay locked down. Dev only: React's dev build and HMR need eval.
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), TURNSTILE, UMAMI_SCRIPT],
    // Inline style attributes (motion transforms, next/font) and Turnstile's injected styles.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "media-src": ["'self'"],
    "connect-src": ["'self'", UMAMI_COLLECT, ...(dev ? ["ws:"] : [])],
    "frame-src": [TURNSTILE],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    ...(dev ? {} : { "upgrade-insecure-requests": [] }),
  };
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}

export function securityHeaders({ dev }: { dev: boolean }): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy({ dev }) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
    ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
  ];
}

/** Immutable build output (hashed JS/CSS/fonts). Next's own path, also on Vercel. */
const BUILD_ASSETS = "/_next/static/:path*";

/**
 * Routes for next.config.ts `headers()`. Everything except the build assets gets the full set. The build assets
 * get nosniff only: CSP, framing and permissions policies have no effect on a script or stylesheet, and their
 * ~700 bytes per response would otherwise be counted ~20 times per page in Lighthouse's script transfer.
 */
export function headerRules({ dev }: { dev: boolean }): { source: string; headers: { key: string; value: string }[] }[] {
  return [
    { source: "/:path((?!_next/static/).*)", headers: securityHeaders({ dev }) },
    { source: BUILD_ASSETS, headers: [{ key: "X-Content-Type-Options", value: "nosniff" }] },
  ];
}
