"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useReducedMotion } from "./useReducedMotion";

// Lenis + GSAP stay out of first-load JS: they load after hydration, only when motion is allowed.
// A failed chunk degrades to native scroll / native cursor instead of throwing to the error boundary.
const SmoothScroll = dynamic(
  () =>
    import("./SmoothScroll")
      .then((m) => m.SmoothScroll)
      .catch(() => () => null),
  { ssr: false },
);
const Cursor = dynamic(
  () =>
    import("./Cursor")
      .then((m) => m.Cursor)
      .catch(() => () => null),
  { ssr: false },
);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  // Public decision signal (CSS hooks, e2e): absent in SSR HTML, set once the client has hydrated and decided.
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? "reduced" : "full";
  }, [reduced]);
  return (
    <>
      {!reduced && <SmoothScroll />}
      {!reduced && <Cursor />}
      {children}
    </>
  );
}
