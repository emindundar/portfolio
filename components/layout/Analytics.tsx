import Script from "next/script";

// Build-time constant (cacheComponents: no per-request env read in render).
const ID = process.env.NEXT_PUBLIC_UMAMI_ID ?? "";
// Optional comma-separated hostnames: the script then reports from those hosts only (not localhost, not previews).
const DOMAINS = (process.env.NEXT_PUBLIC_UMAMI_DOMAINS ?? "").replace(/\s+/g, "");
const DOMAINS_OK = /^[a-z0-9-]+(\.[a-z0-9-]+)+(,[a-z0-9-]+(\.[a-z0-9-]+)+)*$/i.test(DOMAINS);

/** Cookieless Umami Cloud analytics. Renders nothing unless a site id is configured. */
export function Analytics() {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(ID)) return null;
  return (
    <Script
      src="https://cloud.umami.is/script.js"
      data-website-id={ID}
      data-do-not-track="true"
      data-domains={DOMAINS_OK ? DOMAINS : undefined}
      strategy="afterInteractive"
    />
  );
}
