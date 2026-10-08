export function Metrics({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="my-8 grid grid-cols-2 gap-px border border-line bg-line font-mono md:grid-cols-4">
      {items.map((m) => (
        <div key={m.label} className="flex flex-col-reverse bg-surface p-4">
          <dt className="mt-1 text-xs text-muted">{m.label}</dt>
          <dd className="m-0 text-2xl text-fg">{m.value}</dd>
        </div>
      ))}
    </dl>
  );
}
