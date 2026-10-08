// @vitest-environment node
// velite imports esbuild, which fails its TextEncoder invariant under jsdom.
import { describe, it, expect } from "vitest";
import { timelineSchema, servicesSchema, eventsSchema } from "./schema-site";

describe("site schemas", () => {
  it("timeline entry needs kind, from, en/tr titles", () => {
    expect(timelineSchema.safeParse({ kind: "work", from: "2026-02", to: null, org: "Feedback Yem", en: { title: "Software Consultant", body: "x" }, tr: { title: "Yazılım Danışmanı", body: "y" } }).success).toBe(true);
    expect(timelineSchema.safeParse({ kind: "nope", from: "2026-02", org: "x", en: { title: "a" }, tr: { title: "b" } }).success).toBe(false);
  });
  it("allows an empty from only for certificates", () => {
    const base = { org: "x", en: { title: "a" }, tr: { title: "b" } };
    expect(timelineSchema.safeParse({ ...base, kind: "cert", from: "" }).success).toBe(true);
    expect(timelineSchema.safeParse({ ...base, kind: "work", from: "" }).success).toBe(false);
    expect(timelineSchema.safeParse({ ...base, kind: "education", from: "" }).success).toBe(false);
  });
  it("rejects a malformed date", () => {
    expect(timelineSchema.safeParse({ kind: "work", from: "Feb 2026", org: "x", en: { title: "a" }, tr: { title: "b" } }).success).toBe(false);
  });
  it("service needs slug, facet, en/tr", () => {
    expect(servicesSchema.safeParse({ slug: "mobile", facet: "mobile", caseSlug: "geotrack", en: { title: "a", body: "b" }, tr: { title: "c", body: "d" } }).success).toBe(true);
    expect(servicesSchema.safeParse({ slug: "x", facet: "blockchain", caseSlug: "geotrack", en: { title: "a" }, tr: { title: "c" } }).success).toBe(false);
  });
  it("event needs date, place, coords, photo, en/tr caption", () => {
    expect(eventsSchema.safeParse({ slug: "devfest-izmir-24", date: "2024-12-07", place: "İzmir", lat: 38.4514, lng: 27.1705, photo: "/media/events/devfest-izmir-24", en: { title: "DevFest İzmir '24", caption: "x" }, tr: { title: "DevFest İzmir '24", caption: "y" } }).success).toBe(true);
  });
  it("rejects impossible months in timeline dates", () => {
    const base = { kind: "work", org: "x", en: { title: "a" }, tr: { title: "b" } };
    expect(timelineSchema.safeParse({ ...base, from: "2026-12" }).success).toBe(true);
    expect(timelineSchema.safeParse({ ...base, from: "2026-13" }).success).toBe(false);
    expect(timelineSchema.safeParse({ ...base, from: "2026-00" }).success).toBe(false);
    expect(timelineSchema.safeParse({ ...base, from: "2026-01", to: "2026-19" }).success).toBe(false);
  });
  it("accepts org as a string or an { en, tr } pair", () => {
    const base = { kind: "education", from: "2021-09", en: { title: "a" }, tr: { title: "b" } };
    expect(timelineSchema.safeParse({ ...base, org: "Google" }).success).toBe(true);
    expect(timelineSchema.safeParse({ ...base, org: { en: "Pamukkale University", tr: "Pamukkale Üniversitesi" } }).success).toBe(true);
    expect(timelineSchema.safeParse({ ...base, org: { en: "Pamukkale University" } }).success).toBe(false);
    expect(timelineSchema.safeParse({ ...base, org: "" }).success).toBe(false);
  });
  it("rejects out-of-range coordinates and impossible event dates", () => {
    const base = { slug: "e", date: "2024-12-07", place: "İzmir", lat: 38.4, lng: 27.1, photo: "/media/events/e", en: { title: "a" }, tr: { title: "b" } };
    expect(eventsSchema.safeParse(base).success).toBe(true);
    expect(eventsSchema.safeParse({ ...base, lat: 90, lng: -180 }).success).toBe(true);
    expect(eventsSchema.safeParse({ ...base, lat: 90.1 }).success).toBe(false);
    expect(eventsSchema.safeParse({ ...base, lat: -91 }).success).toBe(false);
    expect(eventsSchema.safeParse({ ...base, lng: 180.5 }).success).toBe(false);
    expect(eventsSchema.safeParse({ ...base, lng: -181 }).success).toBe(false);
    expect(eventsSchema.safeParse({ ...base, date: "2024-13-07" }).success).toBe(false);
    expect(eventsSchema.safeParse({ ...base, date: "2024-12-32" }).success).toBe(false);
    expect(eventsSchema.safeParse({ ...base, date: "2024-12-00" }).success).toBe(false);
    expect(eventsSchema.safeParse({ ...base, date: "2024-12-31" }).success).toBe(true);
  });
});
