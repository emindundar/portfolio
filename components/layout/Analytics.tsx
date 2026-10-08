import Script from "next/script";

// Build-time constant (cacheComponents: no per-request env read in render).
const ID = process.env.NEXT_PUBLIC_UMAMI_ID ?? "";

/** Cookieless Umami Cloud analytics. Renders nothing unless a site id is configured. */
export function Analytics() {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(ID)) return null;
  return <Script src="https://cloud.umami.is/script.js" data-website-id={ID} data-do-not-track="true" strategy="afterInteractive" />;
}
