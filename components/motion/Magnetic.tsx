"use client";

import { useState, cloneElement, isValidElement, type ReactElement } from "react";
import { gsap, useGSAP, EASE } from "@/lib/motion";
import { useReducedMotion } from "./useReducedMotion";
import { hasFinePointer, clampMagnet } from "./pointer";

type Props = { strength?: number; max?: number; children: ReactElement<{ ref?: React.Ref<HTMLElement> }> };

export function Magnetic({ strength = 0.3, max = 24, children }: Props) {
  // Callback ref + state: the element reaches the effect without reading a ref during render.
  const [el, setEl] = useState<HTMLElement | null>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (!el || reduced || !hasFinePointer()) return;
      const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: EASE.soft });
      const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: EASE.soft });
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        xTo(clampMagnet(e.clientX - r.left - r.width / 2, strength, max));
        yTo(clampMagnet(e.clientY - r.top - r.height / 2, strength, max));
      };
      const onLeave = () => {
        xTo(0);
        yTo(0);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { dependencies: [el, reduced, strength, max] },
  );

  if (!isValidElement(children)) return children;
  return cloneElement(children, { ref: setEl, "data-magnetic": "" } as Record<string, unknown>);
}
