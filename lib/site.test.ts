import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { KNOWS_ABOUT } from "./site";

const dir = "content/projects";
const stacks = readdirSync(dir)
  .filter((f) => f.endsWith(".meta.json"))
  .flatMap((f) => (JSON.parse(readFileSync(join(dir, f), "utf8")) as { stack: string[] }).stack.map((s) => s.toLowerCase()));

describe("KNOWS_ABOUT", () => {
  it("has 12-16 entries without duplicates (case-insensitive)", () => {
    expect(KNOWS_ABOUT.length).toBeGreaterThanOrEqual(12);
    expect(KNOWS_ABOUT.length).toBeLessThanOrEqual(16);
    expect(new Set(KNOWS_ABOUT.map((k) => k.toLowerCase())).size).toBe(KNOWS_ABOUT.length);
  });
  it.each([...KNOWS_ABOUT])("%s appears in at least one project's stack", (entry) => {
    expect(stacks.some((s) => s.startsWith(entry.toLowerCase())), entry).toBe(true);
  });
  it("leaves out generic techniques that are not technologies", () => {
    for (const k of ["QR", "JWT", "Rate limiting"]) expect(KNOWS_ABOUT).not.toContain(k);
  });
});
