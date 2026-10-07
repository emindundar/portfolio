import { describe, it, expect } from "vitest";
import { parseTheme, readThemeCookie, themeCookieString, THEME_COOKIE } from "./theme";

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

describe("readThemeCookie", () => {
  it("reads the theme cookie from a cookie header", () => {
    expect(readThemeCookie("a=1; theme=light; b=2")).toBe("light");
  });
  it("returns null when missing or invalid", () => {
    expect(readThemeCookie("a=1")).toBeNull();
    expect(readThemeCookie("theme=evil")).toBeNull();
  });
});

describe("themeCookieString", () => {
  it("builds a one-year, lax, root-path cookie", () => {
    expect(themeCookieString("light")).toBe(`${THEME_COOKIE}=light; Path=/; Max-Age=31536000; SameSite=Lax`);
  });
});
