import { getTranslations } from "next-intl/server";
import { FACETS } from "@/content/facet-list";
import type { Project } from "@/lib/content";
import { facetCounts, FACET_LABEL_KEYS } from "@/lib/content/facets";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { Link } from "@/i18n/navigation";

export async function Capabilities({ projects }: { projects: Project[] }) {
  const t = await getTranslations("Capabilities");
  const counts = facetCounts(projects);
  return (
    <section className="px-4 py-16 md:px-6">
      <SectionHeader number="01" title={t("heading")} />
      <SectionReveal className="grid grid-cols-1 border-l border-t border-line md:grid-cols-5">
        {FACETS.map((f) => (
          <Link
            key={f}
            href={{ pathname: "/work", query: { f } }}
            data-reveal
            data-testid="capability"
            className="group flex min-h-40 flex-col justify-between border-b border-r border-line p-5 hover:bg-surface"
          >
            <span className="font-display text-2xl">{t(FACET_LABEL_KEYS[f])}</span>
            <span className="font-mono text-sm text-muted">{t("projects", { count: counts[f] })}</span>
          </Link>
        ))}
      </SectionReveal>
    </section>
  );
}
