"use client";

import { useReducedMotion } from "./useReducedMotion";
import { SmoothScroll } from "./SmoothScroll";
import { Cursor } from "./Cursor";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <>
      {!reduced && <SmoothScroll />}
      {!reduced && <Cursor />}
      {children}
    </>
  );
}
