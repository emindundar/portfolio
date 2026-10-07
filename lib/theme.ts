export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = "theme";

export function parseTheme(v: unknown): Theme | null {
  return v === "dark" || v === "light" ? v : null;
}

export function readThemeCookie(cookieHeader: string): Theme | null {
  const match = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${THEME_COOKIE}=`));
  return match ? parseTheme(match.slice(THEME_COOKIE.length + 1)) : null;
}

export function themeCookieString(t: Theme): string {
  return `${THEME_COOKIE}=${t}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
