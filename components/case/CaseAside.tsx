import { getTranslations } from "next-intl/server";
import type { Project } from "@/lib/content";
import { Metrics } from "@/components/ui/Metrics";
import { cn } from "@/lib/utils/cn";

const LABEL = "font-mono text-xs uppercase text-muted";
const LINK =
  "inline-flex min-h-11 items-center gap-2 [overflow-wrap:anywhere] font-mono text-sm text-fg underline decoration-accent underline-offset-4 hover:text-accent";

/** Last path segment of a repository URL: https://github.com/u/map_tracking → map_tracking. */
function repoName(url: string): string {
  return new URL(url).pathname.split("/").filter(Boolean).pop() ?? url;
}

function External({ href, newTab, children }: { href: string; newTab: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={LINK}>
      {children}
      <span aria-hidden="true">↗</span>
      <span className="sr-only"> ({newTab})</span>
    </a>
  );
}

export async function CaseAside({ project, className }: { project: Project; className?: string }) {
  const t = await getTranslations("Case");
  const { links } = project;
  // Follows the language of the body (project.locale), so an English fallback page stays consistently English.
  const client = project.client?.[project.locale];
  const credits = project.credits?.[project.locale];
  const single = (["live", "demo", "video", "store"] as const).flatMap((k) => (links[k] ? [{ key: k, href: links[k] }] : []));
  const hasLinks = (links.repo?.length ?? 0) > 0 || single.length > 0;

  return (
    <aside data-case-aside className={cn("flex flex-col gap-8 self-start border-t border-line pt-4 md:sticky md:top-24", className)}>
      {project.metrics && project.metrics.length > 0 && (
        <section>
          <h2 className={LABEL}>{t("metrics")}</h2>
          {/* Narrow column: two cells per row at every width, no outer margin. */}
          <div className="mt-3 [&_dl]:my-0 md:[&_dl]:grid-cols-2">
            <Metrics items={project.metrics} />
          </div>
        </section>
      )}
      <section>
        <h2 className={LABEL}>{t("stack")}</h2>
        <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0 font-mono text-xs">
          {project.stack.map((s) => (
            <li key={s} className="border border-line px-2 py-1">
              {s}
            </li>
          ))}
        </ul>
      </section>
      {client && (
        <section>
          <h2 className={LABEL}>{t("client")}</h2>
          <p data-case-client className="mt-3 text-sm">{client}</p>
        </section>
      )}
      {credits && (
        <section>
          <h2 className={LABEL}>{t("credits")}</h2>
          <p data-case-credits className="mt-3 text-sm leading-relaxed">
            {credits}
          </p>
        </section>
      )}
      {hasLinks && (
        <section>
          <h2 className={LABEL}>{t("links")}</h2>
          <ul className="m-0 mt-1 list-none p-0">
            {links.repo?.map((href) => (
              <li key={href}>
                <External href={href} newTab={t("newTab")}>
                  {t("repo")}: {repoName(href)}
                </External>
              </li>
            ))}
            {single.map(({ key, href }) => (
              <li key={key}>
                <External href={href} newTab={t("newTab")}>
                  {t(key)}: {new URL(href).host}
                </External>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
