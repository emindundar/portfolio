import { s } from "velite";
import { FACETS, type Facet } from "./facet-list";

export { FACETS, type Facet };

const MEDIA_BASE = /^\/media\/[a-z0-9-]+\/[a-z0-9-]+$/;

export const projectMetaSchema = s.object({
  slug: s.string().regex(/^[a-z0-9-]+$/, "slug: only a-z, 0-9 and dashes"),
  facets: s.array(s.enum(FACETS)).min(1, "at least one facet").max(3, "at most three facets"),
  stack: s.array(s.string().min(1)).min(1),
  year: s.number().int().min(2020).max(2100),
  role: s.enum(["solo", "lead", "contributor"]),
  featured: s.boolean().default(false),
  order: s.number().int(),
  cover: s
    .object({
      type: s.enum(["video", "image"]),
      src: s.string().regex(MEDIA_BASE, "cover.src: /media/<slug>/<name> without extension"),
      frame: s.enum(["phone", "browser", "none"]),
    })
    .optional(),
  /** Extra image bases (keys of lib/media-manifest.json) shown below the case body. */
  gallery: s.array(s.string().regex(MEDIA_BASE, "gallery: /media/<slug>/<name> without extension")).min(1).optional(),
  client: s.string().max(80).optional(),
  credits: s.string().max(200).optional(),
  links: s
    .object({
      repo: s.array(s.string().url()).optional(),
      live: s.string().url().optional(),
      demo: s.string().url().optional(),
      video: s.string().url().optional(),
      store: s.string().url().optional(),
    })
    .default({}),
});

export type ProjectMeta = ReturnType<typeof projectMetaSchema.parse>;
