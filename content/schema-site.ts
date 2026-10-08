import { s } from "velite";
import { FACETS } from "./facet-list";

const localized = s.object({ title: s.string().min(1), body: s.string().optional(), caption: s.string().optional() });

const MONTH = "(0[1-9]|1[0-2])";
const DAY = "(0[1-9]|[12]\\d|3[01])";
const DATE = new RegExp(`^\\d{4}(-${MONTH})?$`);
const DATE_OR_EMPTY = new RegExp(`^(\\d{4}(-${MONTH})?)?$`);
const FULL_DATE = new RegExp(`^\\d{4}-${MONTH}-${DAY}$`);

export const timelineSchema = s
  .object({
    kind: s.enum(["work", "education", "cert"]),
    // Certificates may have an unknown date ("" = undated); work/education dates are exact.
    from: s.string().regex(DATE_OR_EMPTY),
    to: s.string().regex(DATE).nullable().optional(),
    // Same name in both locales, or an { en, tr } pair (see orgName in lib/content/localize.ts).
    org: s.union([s.string().min(1), s.object({ en: s.string().min(1), tr: s.string().min(1) })]),
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
  date: s.string().regex(FULL_DATE),
  place: s.string().min(1),
  lat: s.number().min(-90).max(90),
  lng: s.number().min(-180).max(180),
  photo: s.string().regex(/^\/media\/events\/[a-z0-9-]+$/),
  en: localized,
  tr: localized,
});

export const nowSchema = s.object({
  updated: s.string().regex(FULL_DATE),
  en: s.object({ text: s.string().min(10).max(160) }),
  tr: s.object({ text: s.string().min(10).max(160) }),
});
