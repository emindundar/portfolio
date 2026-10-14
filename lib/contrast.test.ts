// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { contrast } from "./contrast";

type Tokens = Record<"bg" | "surface" | "line" | "fg" | "muted" | "accent", string>;

// The token values are read straight from the stylesheet, so app/globals.css cannot drift from these rules.
const css = readFileSync("app/globals.css", "utf8");
function tokens(block: RegExp): Tokens {
  const body = css.match(block)![1]!;
  return Object.fromEntries([...body.matchAll(/--(bg|surface|line|fg|muted|accent):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]])) as Tokens;
}
const dark = tokens(/:root\s*\{([^}]+)\}/);
const light = tokens(/:root\[data-theme="light"\]\s*\{([^}]+)\}/);
const lightMedia = tokens(/prefers-color-scheme:\s*light\)\s*\{\s*:root:not\(\[data-theme="dark"\]\)\s*\{([^}]+)\}/);

describe("contrast()", () => {
  it("matches known WCAG values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
    expect(contrast("#ffffff", "#777777")).toBeCloseTo(4.48, 1);
  });
});

describe.each([
  ["dark", dark],
  ["light", light],
] as const)("%s theme tokens", (_name, t) => {
  it("has all six tokens", () => expect(Object.keys(t).sort()).toEqual(["accent", "bg", "fg", "line", "muted", "surface"]));
  it("body text on background and surface ≥ 7:1", () => {
    expect(contrast(t.fg, t.bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(t.fg, t.surface)).toBeGreaterThanOrEqual(7);
  });
  it("muted text on background and surface ≥ 4.5:1", () => {
    expect(contrast(t.muted, t.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.muted, t.surface)).toBeGreaterThanOrEqual(4.5);
  });
  it("primary button: background-coloured text on accent ≥ 4.5:1", () => {
    expect(contrast(t.bg, t.accent)).toBeGreaterThanOrEqual(4.5);
  });
  it("accent as link/hover text on background ≥ 4.5:1", () => {
    expect(contrast(t.accent, t.bg)).toBeGreaterThanOrEqual(4.5);
  });
  it("form control border (muted) on background ≥ 3:1", () => {
    expect(contrast(t.muted, t.bg)).toBeGreaterThanOrEqual(3);
  });
});

it("the two light-theme blocks are identical", () => expect(lightMedia).toEqual(light));
