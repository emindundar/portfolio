import { describe, it, expect } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("handles Turkish characters and punctuation", () => {
    expect(slugify("Çözüm: Ğ, ı İ Ş Ö!")).toBe("cozum-g-i-i-s-o");
  });
  it("returns empty for symbols only", () => {
    expect(slugify("?!")).toBe("");
  });
});
