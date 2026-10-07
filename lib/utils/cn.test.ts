import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy class names with a single space", () => {
    expect(cn("a", "b")).toBe("a b");
  });
  it("drops false, null, undefined and empty strings", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });
  it("returns empty string when nothing truthy", () => {
    expect(cn(false, undefined)).toBe("");
  });
});
