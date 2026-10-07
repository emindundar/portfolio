"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "./useReducedMotion";

// Lenis + GSAP stay out of first-load JS: they load after hydration, only when motion is allowed.
const SmoothScroll = dynamic(() => import("./SmoothScroll").then((m) => m.SmoothScroll), { ssr: false });
const Cursor = dynamic(() => import("./Cursor").then((m) => m.Cursor), { ssr: false });

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
