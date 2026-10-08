import { getTranslations } from "next-intl/server";
import type { Project } from "@/lib/content";

const ROLE_KEYS = { solo: "roleSolo", lead: "roleLead", contributor: "roleContributor" } as const;

export async function CaseHeader({ project, facetLabels }: { project: Project; facetLabels: string[] }) {
  const t = await getTranslations("Case");
  return (
    <header>
      <p className="font-mono text-xs uppercase text-muted">
        {project.year} — {facetLabels.join(" · ")} — <span className="sr-only">{t("role")}: </span>
        {t(ROLE_KEYS[project.role])}
      </p>
      <h1 className="mt-4 max-w-5xl font-display text-[clamp(2.25rem,6vw,5rem)] leading-none">{project.title}</h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{project.summary}</p>
    </header>
  );
}
