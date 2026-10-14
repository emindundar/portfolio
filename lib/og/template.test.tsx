import { describe, it, expect } from "vitest";
import { eyebrowText, fitTitle, OG_SIZE } from "./template";

describe("fitTitle", () => {
  it("keeps short titles large", () => expect(fitTitle("GeoTrack")).toEqual({ fontSize: 112, text: "GeoTrack" }));
  it("steps the size down as the title grows", () => {
    const sizes = [20, 45, 70, 100].map((n) => fitTitle("x".repeat(n)).fontSize);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(56);
  });
  it("cuts an over-long title at a word boundary with an ellipsis", () => {
    const out = fitTitle("word ".repeat(60).trim());
    expect(out.text.length).toBeLessThanOrEqual(121);
    expect(out.text.endsWith("…")).toBe(true);
    expect(out.text).not.toMatch(/\s…$/);
  });
  it("cuts an over-long title without spaces at the limit, never down to one character", () => {
    const out = fitTitle("x".repeat(200));
    expect(out.text).toBe(`${"x".repeat(120)}…`);
  });
  it("ignores a word boundary that would drop more than half of the title", () => {
    const title = `a ${"x".repeat(200)}`;
    expect(fitTitle(title).text).toBe(`${title.slice(0, 120)}…`);
  });
  it("keeps Turkish characters intact", () => expect(fitTitle("Saha Rotalama ve Canlı Konum Backend'i").text).toContain("ı"));
});

it("uses the standard Open Graph size", () => expect(OG_SIZE).toEqual({ width: 1200, height: 630 }));

describe("eyebrowText", () => {
  it("upper-cases with the locale's rules (dotted capital I in Turkish)", () => {
    expect(eyebrowText("Mobil · Veri & ERP · 2026", "tr")).toBe("MOBİL · VERİ & ERP · 2026");
    expect(eyebrowText("Mobile · Data & ERP · 2026", "en")).toBe("MOBILE · DATA & ERP · 2026");
  });
});
