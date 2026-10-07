import { beforeEach, describe, it, expect } from "vitest";
import { applyThemeFromCookie, parseTheme, themeCookieString, THEME_COOKIE } from "./theme";

describe("parseTheme", () => {
  it("accepts dark and light", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("light")).toBe("light");
  });
  it("returns null for anything else", () => {
    expect(parseTheme("evil")).toBeNull();
    expect(parseTheme("")).toBeNull();
    expect(parseTheme(undefined)).toBeNull();
    expect(parseTheme(42)).toBeNull();
  });
});

describe("applyThemeFromCookie", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.cookie = "a=; Max-Age=0";
    document.cookie = "theme=; Max-Age=0";
  });

  it("sets data-theme from a valid cookie", () => {
    document.cookie = "a=1";
    document.cookie = "theme=light";
    applyThemeFromCookie("theme");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
  it("ignores an invalid value", () => {
    document.cookie = "theme=evil";
    applyThemeFromCookie("theme");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
  it("does nothing without a cookie", () => {
    applyThemeFromCookie("theme");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });
  it("is self-contained so it can be stringified into the inline script", () => {
    const src = applyThemeFromCookie.toString();
    expect(src).not.toContain("THEME_COOKIE");
    expect(src).not.toContain("parseTheme");
  });
});

describe("themeCookieString", () => {
  it("builds a one-year, lax, root-path cookie", () => {
    expect(themeCookieString("light")).toBe(`${THEME_COOKIE}=light; Path=/; Max-Age=31536000; SameSite=Lax`);
  });
});
