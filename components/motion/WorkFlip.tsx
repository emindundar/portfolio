"use client";

import { lazy, Suspense, useEffect } from "react";
import { useReducedMotion } from "./useReducedMotion";

// GSAP + Flip load after hydration; the list itself is server-rendered by components/work/WorkList.tsx.
// Motion is an enhancement: a failed chunk renders nothing instead of throwing to the error boundary.
const Impl = lazy(() =>
  import("./WorkFlip.impl")
    .then((m) => ({ default: m.WorkFlipImpl }))
    .catch(() => ({ default: () => null })),
);

/**
 * Effect-only companion of `[data-work-list]`. `data-work-ready=<facet>` on the list says "this filter view
 * is settled, nothing is mid-animation": set immediately under reduced motion, after the Flip otherwise.
 */
export function WorkFlip({ facet }: { facet: string }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!reduced) return;
    const list = document.querySelector<HTMLElement>("[data-work-list]");
    if (list) list.dataset.workReady = facet;
  }, [reduced, facet]);

  if (reduced) return null;
  return (
    <Suspense fallback={null}>
      <Impl facet={facet} />
    </Suspense>
  );
}
