"use client";

import { lazy, Suspense, useCallback, useState, type ElementType } from "react";
import { useReducedMotion } from "./useReducedMotion";

type Tag = "h1" | "h2" | "h3" | "p";

type Props = {
  as?: Tag;
  className?: string;
  delay?: number;
  children: string;
};

// GSAP/SplitText load after hydration. The heading is always rendered here (SSR = plain static markup)
// and never remounted; the lazy component is effect-only.
// Motion is an enhancement: a failed chunk renders nothing instead of throwing to the error boundary.
const Impl = lazy(() =>
  import("./SplitReveal.impl")
    .then((m) => ({ default: m.SplitRevealImpl }))
    .catch(() => ({ default: () => null })),
);

export function SplitReveal({ as: Tag = "h1", className, delay = 0, children }: Props) {
  // The heading and its attach time (wrapper mount) are captured together in the ref callback; the impl's
  // late-arrival guard is measured from here, not from navigation start.
  const [mount, setMount] = useState<{ el: HTMLElement; at: number } | null>(null);
  // Stable identity: an inline callback would be re-invoked (null, then node) on every render and loop.
  const attach = useCallback(
    (node: HTMLElement | null) => setMount(node ? { el: node, at: performance.now() } : null),
    [],
  );
  const reduced = useReducedMotion();
  const Comp: ElementType = Tag;
  return (
    <>
      <Comp ref={attach} className={className}>
        {children}
      </Comp>
      {!reduced && mount && (
        <Suspense fallback={null}>
          <Impl el={mount.el} delay={delay} text={children} mountedAt={mount.at} />
        </Suspense>
      )}
    </>
  );
}
