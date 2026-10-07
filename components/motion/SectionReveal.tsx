"use client";

import { lazy, Suspense, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

// GSAP/ScrollTrigger load after hydration. The block is always rendered here (SSR = plain static markup)
// and never remounted; the lazy component is effect-only. Reduced motion never mounts it, so
// [data-reveal] is never touched (nothing is ever at opacity 0).
const Impl = lazy(() => import("./SectionReveal.impl").then((m) => ({ default: m.SectionRevealImpl })));

export function SectionReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  return (
    <>
      <div ref={setEl} className={className}>
        {children}
      </div>
      {!reduced && el && (
        <Suspense fallback={null}>
          <Impl el={el} />
        </Suspense>
      )}
    </>
  );
}
