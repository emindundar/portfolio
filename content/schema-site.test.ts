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
});
