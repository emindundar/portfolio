export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = "theme";

export function parseTheme(v: unknown): Theme | null {
  return v === "dark" || v === "light" ? v : null;
}

/**
 * Runs in the browser before hydration. ThemeScript stringifies this function into an inline
 * <script>, so it MUST stay self-contained: no references to module-level identifiers, no helpers.
 */
export function applyThemeFromCookie(cookieName: string): void {
  for (const raw of document.cookie.split(";")) {
    const pair = raw.trim();
    if (pair.indexOf(cookieName + "=") === 0) {
      const v = pair.slice(cookieName.length + 1);
      if (v === "dark" || v === "light") document.documentElement.setAttribute("data-theme", v);
      return;
    }
  }
}

export function themeCookieString(t: Theme): string {
  return `${THEME_COOKIE}=${t}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
