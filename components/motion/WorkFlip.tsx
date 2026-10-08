"use client";

import { lazy, Suspense, useEffect } from "react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * `data-work-ready=<facet>` on `[data-work-list]` says "this filter view is settled, nothing is mid-animation".
 * This marker-only component covers every case where no Flip runs: reduced motion and a failed impl chunk.
 */
function WorkReady({ facet }: { facet: string }) {
  useEffect(() => {
    const list = document.querySelector<HTMLElement>("[data-work-list]");
    if (list) list.dataset.workReady = facet;
  }, [facet]);
  return null;
}

// GSAP + Flip load after hydration; the list itself is server-rendered by components/work/WorkList.tsx.
// Motion is an enhancement: a failed chunk degrades to the instant (marker-only) behaviour.
const Impl = lazy(() =>
  import("./WorkFlip.impl")
    .then((m) => ({ default: m.WorkFlipImpl }))
    .catch(() => ({ default: WorkReady })),
);

/** Effect-only companion of `[data-work-list]`: Flip between filter views when motion is allowed. */
export function WorkFlip({ facet }: { facet: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <WorkReady facet={facet} />;
  return (
    <Suspense fallback={null}>
      <Impl facet={facet} />
    </Suspense>
  );
}
