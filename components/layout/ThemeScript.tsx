import { applyThemeFromCookie, THEME_COOKIE } from "@/lib/theme";

const script = `try{(${applyThemeFromCookie.toString()})(${JSON.stringify(THEME_COOKIE)});}catch(e){}`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
