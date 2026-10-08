export function Metrics({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="my-8 grid grid-cols-2 gap-px border border-line bg-line font-mono md:grid-cols-4">
      {items.map((m) => (
        <div key={m.label} className="bg-surface p-4">
          <dd className="m-0 text-2xl text-fg">{m.value}</dd>
          <dt className="mt-1 text-xs text-muted">{m.label}</dt>
        </div>
      ))}
    </dl>
  );
}
