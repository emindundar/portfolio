export function SectionHeader({ number, title, id }: { number: string; title: string; id?: string }) {
  return (
    <div id={id} className="mb-8 flex items-baseline gap-4 border-t border-line pt-4">
      <span className="font-mono text-sm text-muted">{number} /</span>
      <h2 className="font-display text-3xl md:text-5xl">{title}</h2>
    </div>
  );
}
