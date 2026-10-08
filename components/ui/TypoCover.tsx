export function TypoCover({
  slug,
  year,
  facetLabels,
  title,
}: {
  slug: string;
  year: number;
  facetLabels: string[];
  title: string;
}) {
  return (
    <figure data-typo-cover className="m-0 flex aspect-[4/3] flex-col justify-between border border-line bg-surface p-4 md:p-6">
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
