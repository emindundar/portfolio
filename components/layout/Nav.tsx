import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LangToggle } from "./LangToggle";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";

export async function Nav() {
  const t = await getTranslations("Nav");
  const items = [
    { href: "/", label: t("home"), hideOnMobile: true },
    { href: "/work", label: t("work") },
    { href: "/about", label: t("about") },
    { href: "/services", label: t("services") },
    { href: "/contact", label: t("contact") },
  ];
  return (
    // Anchored during view transitions (see app/globals.css): the header never cross-fades or moves.
    <header
      style={{ viewTransitionName: "site-header" }}
      className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-x-4 border-b border-line bg-bg px-4 py-1 md:px-6 font-mono text-sm"
    >
      <Link href="/" className="inline-flex min-h-11 items-center font-display text-lg">
        emin dündar
      </Link>
      <nav
        aria-label={t("primary")}
        className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-4 overflow-x-auto md:gap-6 px-4 md:order-none md:mx-0 md:w-auto md:overflow-visible md:px-0"
      >
        <NavLinks items={items} />
      </nav>
      <div className="flex items-center gap-4">
        <LangToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
