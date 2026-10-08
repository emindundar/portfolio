import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Computed once at module load: a build-time constant is correct for a statically built site.
const YEAR = new Date().getFullYear();

const linkClass = "inline-flex min-h-11 items-center hover:text-fg";

export async function Footer() {
  const t = await getTranslations("Footer");
  const tn = await getTranslations("Nav");
  const tc = await getTranslations("Case");
  const externals = [
    { href: "https://github.com/emindundar", label: "GitHub" },
    { href: "https://www.linkedin.com/in/emindundar", label: "LinkedIn" },
  ];
  return (
    <footer className="flex flex-col gap-2 border-t border-line px-6 py-4 font-mono text-sm text-muted md:flex-row md:items-center md:justify-between">
      <p>
        © {YEAR} {t("rights")}
      </p>
      <nav aria-label={t("nav")} className="flex flex-wrap gap-x-6">
        <Link href="/colophon" className={linkClass}>{tn("colophon")}</Link>
        {externals.map((e) => (
          <a key={e.href} href={e.href} target="_blank" rel="noreferrer noopener" className={linkClass}>
            {e.label}
            <span className="sr-only"> ({tc("newTab")})</span>
          </a>
        ))}
      </nav>
    </footer>
  );
}
