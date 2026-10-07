import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";

export async function Nav() {
  const t = await getTranslations("Nav");
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bg px-6 py-3 font-mono text-sm">
      <Link href="/" className="font-display text-lg">
        emin dündar
      </Link>
      <nav className="flex gap-6">
        <Link href="/" className="text-muted hover:text-fg">{t("home")}</Link>
      </nav>
      <div className="flex gap-4">
        <LangToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
