export function TypoCover({
  slug,
  year,
  facetLabels,
  title,
  variant = "full",
  decorative = false,
}: {
  slug: string;
  year: number;
  facetLabels: string[];
  title: string;
  /** "compact": thumbnail next to a row that already shows title and facets — slug and year only. */
  variant?: "full" | "compact";
  /** Case hero: the <h1>, year and facets are already in the header right above, so hide the repeat from assistive tech. */
  decorative?: boolean;
}) {
  if (variant === "compact") {
    return (
      <figure
        data-typo-cover
        data-variant="compact"
        className="m-0 flex aspect-[4/3] flex-col justify-between border border-line bg-surface p-4"
      >
        <span className="self-end font-mono text-xs text-muted">{year}</span>
        <figcaption className="break-words font-mono text-xl leading-tight text-fg">{slug}</figcaption>
      </figure>
    );
  }
  return (
    <figure data-typo-cover data-variant="full" aria-hidden={decorative || undefined} className="m-0 flex aspect-[4/3] flex-col justify-between border border-line bg-surface p-4 md:p-6">
      <div className="flex items-baseline justify-between font-mono text-xs text-muted">
        <span>{slug}</span>
        <span>{year}</span>
      </div>
      <figcaption className="font-display text-3xl leading-tight text-fg md:text-4xl">{title}</figcaption>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0 font-mono text-xs text-muted">
        {facetLabels.map((l) => (
          <li key={l} className="border border-line px-2 py-1">
            {l}
          </li>
        ))}
      </ul>
    </figure>
  );
}
