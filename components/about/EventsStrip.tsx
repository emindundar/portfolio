import type { Locale } from "@/i18n/routing";
import { getEvents } from "@/lib/content";
import { formatCoords, formatDate } from "@/lib/format";
import { imageFor } from "@/lib/media";

export function EventsStrip({ locale }: { locale: Locale }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {getEvents(locale).map((ev) => {
        const img = imageFor(ev.photo);
        return (
          <figure key={ev.slug} data-reveal className="m-0 flex flex-col gap-3">
            {img && (
              <div className="aspect-[4/5] overflow-hidden border border-line bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- pre-generated responsive set */}
                <img
                  src={img.src}
                  srcSet={img.srcSet}
                  sizes="(min-width: 768px) 30vw, 100vw"
                  alt={ev.text.title}
                  width={img.width}
                  height={img.height}
                  loading="lazy"
                  decoding="async"
                  className="block h-full w-full object-cover"
                />
              </div>
            )}
            <figcaption className="flex flex-col gap-1">
              <span className="font-display text-xl leading-tight">{ev.text.title}</span>
              <span className="font-mono text-xs uppercase text-muted">
                {formatDate(ev.date, locale)} — {ev.place}
              </span>
              <span className="font-mono text-xs text-muted">{formatCoords(ev.lat, ev.lng)}</span>
              {ev.text.caption && <span className="text-sm text-muted">{ev.text.caption}</span>}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
