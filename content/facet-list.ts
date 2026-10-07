// Velite-free so client/server app bundles can import it (content/schema.ts pulls velite -> esbuild).
export const FACETS = ["mobile", "web", "backend", "ai", "data-erp"] as const;
export type Facet = (typeof FACETS)[number];
