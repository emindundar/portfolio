import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { KNOWS_ABOUT } from "./site";

const dir = "content/projects";
const stacks = readdirSync(dir)
  .filter((f) => f.endsWith(".meta.json"))
  .flatMap((f) => (JSON.parse(readFileSync(join(dir, f), "utf8")) as { stack: string[] }).stack.map((s) => s.toLowerCase()));

/** Stack entries that name a KNOWS_ABOUT entry in another form (a version, a product name). */
const ALIASES: Record<string, string[]> = { postgresql: ["postgresql 16"] };
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Equal, an alias, or the entry as a whole word inside the stack item ("Docker" in "Docker Compose", not "Next" in "Next.js"). */
function inStack(entry: string): boolean {
  const e = entry.toLowerCase();
  const word = new RegExp(`(^|[^\\p{L}\\p{N}.])${escape(e)}($|[^\\p{L}\\p{N}.])`, "u");
  return stacks.some((s) => s === e || (ALIASES[e] ?? []).includes(s) || word.test(s));
}

describe("KNOWS_ABOUT", () => {
  it("has 12-16 entries without duplicates (case-insensitive)", () => {
    expect(KNOWS_ABOUT.length).toBeGreaterThanOrEqual(12);
    expect(KNOWS_ABOUT.length).toBeLessThanOrEqual(16);
    expect(new Set(KNOWS_ABOUT.map((k) => k.toLowerCase())).size).toBe(KNOWS_ABOUT.length);
  });
  it.each([...KNOWS_ABOUT])("%s appears in at least one project's stack", (entry) => {
    expect(inStack(entry), entry).toBe(true);
  });
  it("matches whole words only", () => {
    expect(inStack("Docker")).toBe(true); // "docker compose"
    expect(inStack("PostgreSQL")).toBe(true); // alias of "postgresql 16"
    expect(inStack("Next")).toBe(false); // "next.js" is not the word "next"
    expect(inStack("Fire")).toBe(false); // prefix of "firebase"
    expect(inStack("View")).toBe(false); // inside "webview", not a word of its own
  });
  it("leaves out generic techniques that are not technologies", () => {
    for (const k of ["QR", "JWT", "Rate limiting"]) expect(KNOWS_ABOUT).not.toContain(k);
  });
});
