import { describe, it, expect } from "vitest";
import { isActive } from "./isActive";

describe("isActive", () => {
  it("matches / exactly", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/work", "/")).toBe(false);
  });
  it("matches sections by prefix on segment boundaries", () => {
    expect(isActive("/work", "/work")).toBe(true);
    expect(isActive("/work/geotrack", "/work")).toBe(true);
    expect(isActive("/workshop", "/work")).toBe(false);
    expect(isActive("/about", "/work")).toBe(false);
  });
});
