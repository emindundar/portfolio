import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getNow } from "@/lib/content/site";
import { formatDate } from "@/lib/format";
import { getNowStats } from "@/lib/now";

export async function NowPanel({ locale }: { locale: Locale }) {
  const t = await getTranslations("Now");
  const tc = await getTranslations("Common");
  const now = getNow(locale);
  const stats = await getNowStats();
  return (
    <section aria-labelledby="now-heading" data-now className="border-y border-line px-4 py-6 md:px-6">
      <div className="grid gap-4 font-mono text-sm md:grid-cols-12">
        <h2 id="now-heading" className="flex items-center gap-2 uppercase text-muted md:col-span-2">
          <span className="inline-block h-2 w-2 bg-accent" aria-hidden="true" />
          {t("heading")}
        </h2>
        <div className="md:col-span-6">
          <p className="font-sans text-base text-fg">{now.text}</p>
          <p className="mt-1 text-xs text-muted">
            {t("updated")} <time dateTime={now.updated}>{formatDate(now.updated, locale)}</time>
          </p>
        </div>
        {stats && (
          <div data-now-live className="md:col-span-4">
            <p>
              <span className="text-muted">{t("lastPush")}: </span>
              <a href={stats.repo.url} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center underline underline-offset-4 md:min-h-0">
                {/* One flex item, with the space in normal flow: leading whitespace inside the sr-only box can be collapsed out of the name. */}
                <span>
                  {stats.repo.name} <span className="sr-only">({tc("newTab")})</span>
                </span>
              </a>
              <span className="text-muted"> · </span>
              <time dateTime={stats.pushedAt}>{formatDate(stats.pushedAt, locale)}</time>
            </p>
            {stats.commits30d !== null && <p className="text-muted">{t("commits", { count: stats.commits30d })}</p>}
            <p className="mt-1 text-xs text-muted">{t("source")}</p>
          </div>
        )}
      </div>
    </section>
  );
}
