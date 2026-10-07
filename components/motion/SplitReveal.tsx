"use client";

import { lazy, Suspense, useState, type ElementType } from "react";
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
const Impl = lazy(() => import("./SplitReveal.impl").then((m) => ({ default: m.SplitRevealImpl })));

export function SplitReveal({ as: Tag = "h1", className, delay = 0, children }: Props) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const Comp: ElementType = Tag;
  return (
    <>
      <Comp ref={setEl} className={className}>
        {children}
      </Comp>
      {!reduced && el && (
        <Suspense fallback={null}>
          <Impl el={el} delay={delay} text={children} />
        </Suspense>
      )}
    </>
  );
}
