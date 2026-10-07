import { getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { getProjects } from "@/lib/content";
import { hasLocale } from "next-intl";
import type { Metadata } from "next";
import { alternatesFor } from "@/lib/seo";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { HeroShaderLoader } from "@/components/canvas/HeroShaderLoader";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  return { alternates: alternatesFor("/", locale) };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("Home");
  const projects = hasLocale(routing.locales, locale) ? getProjects(locale as Locale) : [];

  return (
    <main className="p-6">
      <section className="relative isolate min-h-[80vh] overflow-hidden">
        <HeroShaderLoader />
        <p className="font-mono text-muted uppercase tracking-wide">{t("eyebrow")}</p>
        <SplitReveal as="h1" className="font-display text-6xl">
          {t("headline")}
        </SplitReveal>
      </section>

      <section className="mt-12 border-t border-line pt-6">
        <h2 className="font-mono text-muted">01 / {t("projectsHeading")}</h2>
        <ul className="mt-4">
          {projects.map((p) => (
            <li key={p.slug} className="border-b border-line py-3" data-testid="project">
              <span className="font-display text-2xl">{p.title}</span>
              <span className="ml-3 font-mono text-muted">
                {p.year} — {p.facets.join(" · ").toUpperCase()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
