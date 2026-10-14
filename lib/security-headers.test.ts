import { describe, it, expect } from "vitest";
import { contentSecurityPolicy, headerRules, securityHeaders } from "./security-headers";

const parse = (csp: string) =>
  Object.fromEntries(
    csp
      .split(";")
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [k, ...v] = d.split(/\s+/);
        return [k, v];
      }),
  );

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
    // Observed on the live site: cloud.umami.is/script.js posts to https://gateway.umami.is/api/send.
    expect(p["connect-src"]).toEqual(["'self'", "https://gateway.umami.is"]);
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
    expect(h["Strict-Transport-Security"]).toBe("max-age=63072000; includeSubDomains");
    expect(h["Content-Security-Policy"]).toBe(contentSecurityPolicy({ dev: false }));
  });
  it("omits HSTS in development", () => {
    expect(securityHeaders({ dev: true }).map((x) => x.key)).not.toContain("Strict-Transport-Security");
  });
});

describe("headerRules", () => {
  const rules = headerRules({ dev: false });
  // Next's path-to-regexp: `/:path*` is any path, `/:name(re)` a named segment with a custom pattern.
  const matches = (source: string, path: string) => new RegExp(`^${source.replace("/:path*", "(?:/.*)?").replace(/:\w+\(/, "(")}$`).test(path);
  it("sends the full set on every path except the immutable build assets", () => {
    const doc = rules.find((r) => r.headers.some((h) => h.key === "Content-Security-Policy"))!;
    expect(doc.headers).toEqual(securityHeaders({ dev: false }));
    for (const path of ["/", "/en", "/tr/work/geotrack", "/sitemap.xml", "/media/karaoke-sync/poster-1280.webp", "/en/opengraph-image"]) {
      expect(matches(doc.source, path), path).toBe(true);
    }
    // CSP and friends do nothing on a script or stylesheet, but Lighthouse counts their bytes as script transfer.
    expect(matches(doc.source, "/_next/static/chunks/abc.js")).toBe(false);
  });
  it("still marks the build assets nosniff", () => {
    const assets = rules.find((r) => r.source === "/_next/static/:path*")!;
    expect(assets.headers).toEqual([{ key: "X-Content-Type-Options", value: "nosniff" }]);
  });
});
