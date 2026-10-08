import { s } from "velite";
import { FACETS } from "./facet-list";

const localized = s.object({ title: s.string().min(1), body: s.string().optional(), caption: s.string().optional() });

const DATE = /^\d{4}(-\d{2})?$/;

export const timelineSchema = s
  .object({
    kind: s.enum(["work", "education", "cert"]),
    // Certificates may have an unknown date ("" = undated); work/education dates are exact.
    from: s.string().regex(/^(\d{4}(-\d{2})?)?$/),
    to: s.string().regex(DATE).nullable().optional(),
    org: s.string().min(1),
    place: s.string().optional(),
    en: localized,
    tr: localized,
  })
  .refine((e) => e.kind === "cert" || DATE.test(e.from), {
    message: "from: YYYY or YYYY-MM is required unless kind is cert",
    path: ["from"],
  });

export const servicesSchema = s.object({
  slug: s.string().regex(/^[a-z0-9-]+$/),
  facet: s.enum(FACETS),
  caseSlug: s.string().regex(/^[a-z0-9-]+$/),
  en: localized,
  tr: localized,
});

export const eventsSchema = s.object({
  slug: s.string().regex(/^[a-z0-9-]+$/),
  date: s.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  place: s.string().min(1),
  lat: s.number(),
  lng: s.number(),
  photo: s.string().regex(/^\/media\/events\/[a-z0-9-]+$/),
  en: localized,
  tr: localized,
});
