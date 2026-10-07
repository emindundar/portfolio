import { getTranslations } from "next-intl/server";
import type { Project } from "@/lib/content";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SectionReveal } from "@/components/motion/SectionReveal";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { FACET_LABEL_KEYS } from "@/lib/content/facets";

export async function FeaturedProjects({ projects }: { projects: Project[] }) {
  const t = await getTranslations("Home");
  const tc = await getTranslations("Capabilities");
  const featured = projects.filter((p) => p.featured).slice(0, 4);
  return (
    <section className="px-4 py-16 md:px-6">
      <SectionHeader number="02" title={t("projectsHeading")} />
      <SectionReveal>
        <ol className="border-t border-line">
          {featured.map((p, i) => (
            <li key={p.slug} data-reveal data-testid="project" className="border-b border-line">
              <Link href={`/work/${p.slug}`} className="grid grid-cols-[3rem_1fr] items-baseline gap-4 py-6 hover:bg-surface md:grid-cols-[4rem_1fr_auto]">
                <span aria-hidden="true" className="font-mono text-sm text-muted">0{i + 1}</span>
                <span className="font-display text-2xl md:text-4xl">{p.title}</span>
                <span className="col-start-2 font-mono text-xs uppercase text-muted md:col-start-3">
                  {p.year} — {p.facets.map((f) => tc(FACET_LABEL_KEYS[f])).join(" · ")}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <Button href="/work" variant="ghost">{t("allWork")} <span aria-hidden="true">→</span></Button>
        </div>
      </SectionReveal>
    </section>
  );
}
