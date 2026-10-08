import { getTranslations } from "next-intl/server";
import type { Project } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";

const CELL = "group flex min-h-24 flex-col justify-between gap-3 bg-bg p-4 hover:bg-surface md:p-6";

/** Previous / next case by `order`; the ends of the list simply have one neighbour. */
export async function CaseNav({ prev, next }: { prev?: Project; next?: Project }) {
  const t = await getTranslations("Case");
  return (
    <nav aria-label={t("nav")} data-case-nav className="mt-16 md:mt-24">
      <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
        {prev ? (
          <Link href={`/work/${prev.slug}`} transitionTypes={["nav-back"]} className={CELL}>
            <span className="font-mono text-xs uppercase text-muted group-hover:text-accent">
              <span aria-hidden="true">← </span>
              {t("prev")}
              <span className="sr-only">: </span>
            </span>
            <span className="font-display text-2xl leading-tight md:text-3xl">{prev.title}</span>
          </Link>
        ) : (
          <div aria-hidden="true" className="hidden bg-bg sm:block" />
        )}
        {next ? (
          <Link href={`/work/${next.slug}`} transitionTypes={["nav-forward"]} className={`${CELL} sm:items-end sm:text-right`}>
            <span className="font-mono text-xs uppercase text-muted group-hover:text-accent">
              {t("next")}
              <span className="sr-only">: </span>
              <span aria-hidden="true"> →</span>
            </span>
            <span className="font-display text-2xl leading-tight md:text-3xl">{next.title}</span>
          </Link>
        ) : (
          <div aria-hidden="true" className="hidden bg-bg sm:block" />
        )}
      </div>
      <div className="mt-6">
        <Button href="/work" variant="ghost">
          <span aria-hidden="true">←</span> {t("backToWork")}
        </Button>
      </div>
    </nav>
  );
}
