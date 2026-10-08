import { getTranslations } from "next-intl/server";
import { FACETS, type Facet } from "@/content/facet-list";
import type { Project } from "@/lib/content";
import { facetCounts, FACET_LABEL_KEYS } from "@/lib/content/facets";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

// Plain links: the server does the filtering, so this works without JavaScript.
export async function WorkFilter({ active, projects }: { active: Facet | null; projects: Project[] }) {
  const t = await getTranslations("Work");
  const tc = await getTranslations("Capabilities");
  const counts = facetCounts(projects);
  const chips: { facet: Facet | null; label: string; count: number }[] = [
    { facet: null, label: t("filterAll"), count: projects.length },
    ...FACETS.map((f) => ({ facet: f, label: tc(FACET_LABEL_KEYS[f]), count: counts[f] })),
  ];
  return (
    <nav aria-label={t("filterLabel")} data-work-filter className="mt-12">
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {chips.map((c) => {
          const current = c.facet === active;
          return (
            <li key={c.facet ?? "all"}>
              <Link
                href={c.facet ? { pathname: "/work", query: { f: c.facet } } : "/work"}
                aria-current={current ? "page" : undefined}
                scroll={false}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 border px-4 font-mono text-sm uppercase tracking-wide transition-colors duration-200",
                  current ? "border-fg bg-fg text-bg" : "border-line text-fg hover:border-fg",
                )}
              >
                {c.label}
                <span aria-hidden="true" className={current ? undefined : "text-muted"}>
                  {c.count}
                </span>
                <span className="sr-only">{t("count", { count: c.count })}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
