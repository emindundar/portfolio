import { s } from "velite";

export const FACETS = ["mobile", "web", "backend", "ai", "data-erp"] as const;
export type Facet = (typeof FACETS)[number];

export const projectMetaSchema = s.object({
  slug: s.string().regex(/^[a-z0-9-]+$/, "slug: only a-z, 0-9 and dashes"),
  facets: s.array(s.enum(FACETS)).min(1, "at least one facet").max(3, "at most three facets"),
  stack: s.array(s.string().min(1)).min(1),
  year: s.number().int().min(2020).max(2100),
  role: s.enum(["solo", "lead", "contributor"]),
  featured: s.boolean().default(false),
  order: s.number().int(),
  cover: s.object({
    type: s.enum(["video", "image"]),
    src: s.string().min(1),
    poster: s.string().optional(),
    frame: s.enum(["phone", "browser", "none"]),
  }),
  links: s
    .object({
      repo: s.array(s.string().url()).optional(),
      demo: s.string().url().optional(),
      video: s.string().url().optional(),
      store: s.string().url().optional(),
    })
    .default({}),
});

export type ProjectMeta = ReturnType<typeof projectMetaSchema.parse>;
