export function FlowDiagram({ steps, label }: { steps: string[]; label?: string }) {
  return (
    <ol
      aria-label={label}
      className="m-0 my-8 flex list-none flex-col gap-2 p-0 font-mono text-sm md:flex-row md:flex-wrap md:items-stretch"
    >
      {steps.map((step, i) => (
        <li key={`${i}-${step}`} className="flex flex-col gap-2 md:flex-1 md:flex-row md:items-stretch">
          {i > 0 && (
            <span aria-hidden="true" className="self-center text-muted">
              <span className="md:hidden">↓</span>
              <span className="hidden md:inline">→</span>
            </span>
          )}
          <span className="flex-1 border border-line bg-surface px-4 py-3 text-fg">{step}</span>
        </li>
      ))}
    </ol>
  );
}
