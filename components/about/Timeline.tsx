import type { Locale } from "@/i18n/routing";
import { getTimeline, orgName } from "@/lib/content";
import { formatRange } from "@/lib/format";

/** Work + education, newest first (list order in content/timeline.json is already newest first; sort defensively). */
export function Timeline({ locale }: { locale: Locale }) {
  const items = getTimeline(locale)
    .filter((e) => e.kind !== "cert")
    .sort((a, b) => b.from.localeCompare(a.from));
  return (
    <ol className="m-0 list-none border-t border-line p-0">
      {items.map((e) => (
        <li key={`${e.kind}-${e.from}-${e.text.title}`} data-reveal className="grid gap-2 border-b border-line py-6 md:grid-cols-12 md:gap-6">
          <p className="font-mono text-sm text-muted md:col-span-3">{formatRange(e.from, e.to, locale)}</p>
          <div className="md:col-span-9">
            <h3 className="font-display text-2xl leading-tight md:text-3xl">{e.text.title}</h3>
            <p className="mt-1 font-mono text-sm text-muted">
              {orgName(e, locale)}
              {e.place ? ` — ${e.place}` : ""}
            </p>
            {e.text.body && <p className="mt-3 max-w-2xl leading-relaxed">{e.text.body}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
