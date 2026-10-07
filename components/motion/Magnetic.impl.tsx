"use client";

import { gsap, useGSAP, EASE } from "@/lib/motion";
import { hasFinePointer, clampMagnet } from "./pointer";

type Props = { el: HTMLElement | null; strength: number; max: number };

// Effect-only: the child element is rendered (and stays mounted) by Magnetic.tsx.
export function MagneticImpl({ el, strength, max }: Props) {
  useGSAP(
    () => {
      if (!el || !hasFinePointer()) return;
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
    { dependencies: [el, strength, max], revertOnUpdate: true },
  );
  return null;
}
