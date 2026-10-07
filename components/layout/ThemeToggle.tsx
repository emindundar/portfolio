"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { parseTheme, themeCookieString, type Theme } from "@/lib/theme";

function currentTheme(): Theme {
  const attr = parseTheme(document.documentElement.getAttribute("data-theme"));
  if (attr) return attr;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeToggle() {
  const t = useTranslations("Nav");
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Read the DOM theme after mount so server and first client render match (hydration-safe).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(currentTheme());
  }, []);

  function toggle() {
    const next: Theme = (theme ?? currentTheme()) === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    document.cookie = themeCookieString(next);
    setTheme(next);
  }

  const label = theme === "light" ? t("themeDark") : t("themeLight");

  return (
    <button type="button" onClick={toggle} aria-label={`${t("theme")}: ${label}`} className="font-mono text-muted hover:text-fg">
      [{label}]
    </button>
  );
}
