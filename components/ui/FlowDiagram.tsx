import { Fragment } from "react";

export function FlowDiagram({ steps, label }: { steps: string[]; label?: string }) {
  return (
    <ol
      aria-label={label}
      className="not-prose m-0 my-8 flex list-none flex-col gap-2 p-0 font-mono text-sm md:flex-row md:flex-wrap md:items-stretch"
    >
      {steps.map((step, i) => (
        <Fragment key={`${i}-${step}`}>
          <li className="flex-1 border border-line bg-surface px-4 py-3 text-fg">{step}</li>
          {i < steps.length - 1 && (
            <span aria-hidden="true" className="self-center text-muted md:rotate-0 rotate-90">
              →
            </span>
          )}
        </Fragment>
      ))}
    </ol>
  );
}
