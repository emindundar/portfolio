import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LangToggle } from "./LangToggle";
import { ThemeToggle } from "./ThemeToggle";

export async function Nav() {
  const t = await getTranslations("Nav");
  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-bg px-6 py-3 font-mono text-sm">
      <Link href="/" className="font-display text-lg">
        emin dündar
      </Link>
      <nav className="order-last flex w-full gap-6 md:order-none md:w-auto">
        <Link href="/" className="text-muted hover:text-fg">{t("home")}</Link>
        <Link href="/work" className="text-muted hover:text-fg">{t("work")}</Link>
        <Link href="/about" className="text-muted hover:text-fg">{t("about")}</Link>
        <Link href="/contact" className="text-muted hover:text-fg">{t("contact")}</Link>
      </nav>
      <div className="flex gap-4">
        <LangToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
