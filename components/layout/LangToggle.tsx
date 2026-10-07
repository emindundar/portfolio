"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils/cn";

export function LangToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("Nav");

  return (
    <nav aria-label={t("lang")} className="flex gap-2 font-mono">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={pathname}
          locale={l}
          aria-current={l === locale ? "true" : undefined}
          className={cn(l === locale ? "text-fg" : "text-muted hover:text-fg")}
        >
          [{l}]
        </Link>
      ))}
    </nav>
  );
}
