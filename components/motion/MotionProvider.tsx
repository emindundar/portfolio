"use client";

import { useReducedMotion } from "./useReducedMotion";
import { SmoothScroll } from "./SmoothScroll";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <>
      {!reduced && <SmoothScroll />}
      {children}
    </>
  );
}
