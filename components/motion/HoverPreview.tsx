"use client";

import { lazy, Suspense, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";
import { useFinePointer } from "./pointer";

export type PreviewCover = { src: string; width: number; height: number };

// Motion is an enhancement: a failed chunk renders nothing instead of throwing to the error boundary.
const Impl = lazy(() =>
  import("./HoverPreview.impl")
    .then((m) => ({ default: m.HoverPreviewImpl }))
    .catch(() => ({ default: () => null })),
);

/**
 * Floating cover that follows the pointer over `[data-work-item]` rows. Decorative (the row already names the
 * project), so it is aria-hidden and only exists for fine pointers with motion allowed.
 * `covers` is keyed by project slug; rows without an entry show nothing.
 */
export function HoverPreview({ covers }: { covers: Record<string, PreviewCover> }) {
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const [el, setEl] = useState<HTMLDivElement | null>(null);

  if (reduced || !fine) return null;
  return (
    <>
      <div
        ref={setEl}
        aria-hidden="true"
        data-hover-preview
        className="pointer-events-none invisible fixed left-0 top-0 z-50 border border-line bg-surface p-1"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- src is swapped by the impl on hover */}
        <img alt="" decoding="async" className="block h-auto max-h-[22rem] w-auto max-w-[22rem]" />
      </div>
      {el && (
        <Suspense fallback={null}>
          <Impl el={el} covers={covers} />
        </Suspense>
      )}
    </>
  );
}
