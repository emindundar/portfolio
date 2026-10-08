import { getTranslations } from "next-intl/server";
import type { Facet } from "@/content/facet-list";
import type { Project } from "@/lib/content";
import { FACET_LABEL_KEYS } from "@/lib/content/facets";
import { imageFor, videoFor } from "@/lib/media";
import { Link } from "@/i18n/navigation";
import { MediaCover } from "@/components/media/MediaCover";
import { WorkFlip } from "@/components/motion/WorkFlip";
import { HoverPreview, type PreviewCover } from "@/components/motion/HoverPreview";

function previewFor(p: Project): PreviewCover | null {
  const c = p.cover;
  if (!c) return null;
  if (c.type === "video") {
    const v = videoFor(c.src);
    return v ? { src: v.poster, width: v.width, height: v.height } : null;
  }
  const img = imageFor(c.src);
  return img ? { src: img.src, width: img.width, height: img.height } : null;
}

// The list cover is a thumbnail: MediaCover's frames are sized for a wide column, so they are scaled down here
// (phone frame narrowed, video/poster height-capped, typographic cover fills the box with small type).
const COVER_BOX =
  "hidden h-48 flex-col justify-center overflow-hidden md:flex " +
  "[&_[data-frame=phone]]:max-w-24 " +
  "[&_video]:max-h-40 [&_video]:w-auto [&_[data-video-poster]]:max-h-40 [&_[data-video-poster]]:w-auto " +
  "[&_[data-typo-cover]]:aspect-auto [&_[data-typo-cover]]:h-full [&_[data-typo-cover]]:p-3 " +
  "[&_figcaption]:line-clamp-3 [&_figcaption]:text-base";

// Server component. Rows keep their identity across filter changes (key = slug, no key on the list),
// which is what lets WorkFlip animate the same DOM nodes to their new positions.
export async function WorkList({ items, facet }: { items: Project[]; facet: Facet | null }) {
  const t = await getTranslations("Work");
  const tc = await getTranslations("Capabilities");
  const covers: Record<string, PreviewCover> = {};
  for (const p of items) {
    const c = previewFor(p);
    if (c) covers[p.slug] = c;
  }

  if (items.length === 0) {
    return (
      <p data-work-empty className="mt-8 border-t border-line pt-6 font-mono text-muted">
        {t("empty")}
      </p>
    );
  }

  return (
    <>
      {/* Before the list on purpose: see WorkFlip. */}
      <WorkFlip facet={facet ?? "all"} />
      <ol data-work-list className="m-0 mt-8 list-none border-t border-line p-0">
        {items.map((p, i) => {
          const labels = p.facets.map((f) => tc(FACET_LABEL_KEYS[f]));
          return (
            <li key={p.slug} data-work-item data-flip-id={p.slug} className="border-b border-line bg-bg">
              <Link
                href={`/work/${p.slug}`}
                transitionTypes={["nav-forward"]}
                className="group grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 py-6 hover:bg-surface md:grid-cols-[4rem_minmax(0,1fr)_16rem] md:items-center md:gap-x-6 md:py-8"
              >
                <div aria-hidden="true" className="self-start pt-1 font-mono text-sm text-muted md:pt-2">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="flex min-w-0 flex-col gap-3 self-start">
                  <div className="font-display text-2xl leading-tight md:text-4xl">{p.title}</div>
                  <div className="font-mono text-xs uppercase text-muted">
                    {p.year} — {labels.join(" · ")}
                  </div>
                  <div className="max-w-2xl text-muted md:line-clamp-2">{p.summary}</div>
                  <div className="font-mono text-xs uppercase text-fg group-hover:text-accent">
                    {t("viewCase")} <span aria-hidden="true">→</span>
                  </div>
                </div>
                <div aria-hidden="true" className={COVER_BOX}>
                  <MediaCover project={p} kind="list" facetLabels={labels} />
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
      <HoverPreview covers={covers} />
    </>
  );
}
