import { describe, it, expect } from "vitest";
import { formatRange, formatCoords, formatDate } from "./format";
describe("formatRange", () => {
  it("en month-year with Present", () => { expect(formatRange("2026-02", null, "en")).toBe("Feb 2026 — Present"); });
  it("tr month-year with Devam", () => { expect(formatRange("2026-02", null, "tr")).toBe("Şub 2026 — Devam"); });
  it("year-only entries", () => {
    expect(formatRange("2024", "2024", "en")).toBe("2024");
    expect(formatRange("2021-09", "2025-06", "tr")).toBe("Eyl 2021 — Haz 2025");
  });
  it("undefined end counts as ongoing; empty start yields empty string", () => {
    expect(formatRange("2026-02", undefined, "en")).toBe("Feb 2026 — Present");
    expect(formatRange("", null, "en")).toBe("");
  });
});
describe("formatCoords", () => {
  it("formats N/E with 4 decimals", () => { expect(formatCoords(38.45143, 27.17053)).toBe("38.4514°N 27.1705°E"); });
  it("formats S/W hemispheres", () => { expect(formatCoords(-33.8688, -151.2093)).toBe("33.8688°S 151.2093°W"); });
});
describe("formatDate", () => {
  it("formats ISO dates in UTC", () => {
    expect(formatDate("2024-12-07", "en")).toBe("7 Dec 2024");
    expect(formatDate("2024-12-07", "tr")).toBe("7 Ara 2024");
  });
});
