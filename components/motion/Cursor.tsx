"use client";

import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "@/lib/motion";
import { useReducedMotion } from "./useReducedMotion";
import { useFinePointer } from "./pointer";

export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const enabled = !reduced && fine;

  useEffect(() => {
    if (!enabled) return;
    document.body.dataset.cursor = "custom";
    return () => {
      delete document.body.dataset.cursor;
    };
  }, [enabled]);

  useGSAP(
    () => {
      if (!enabled || !dot.current || !ring.current) return;
      const dx = gsap.quickTo(dot.current, "x", { duration: 0.08 });
      const dy = gsap.quickTo(dot.current, "y", { duration: 0.08 });
      const rx = gsap.quickTo(ring.current, "x", { duration: 0.35, ease: "power3.out" });
      const ry = gsap.quickTo(ring.current, "y", { duration: 0.35, ease: "power3.out" });
      const onMove = (e: PointerEvent) => {
        dx(e.clientX);
        dy(e.clientY);
        rx(e.clientX);
        ry(e.clientY);
      };
      const onOver = (e: Event) => {
        const t = (e.target as Element).closest("a, button, [data-magnetic]");
        gsap.to(ring.current, { scale: t ? 2.2 : 1, duration: 0.25 });
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerover", onOver);
      return () => {
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerover", onOver);
      };
    },
    { dependencies: [enabled] },
  );

  if (!enabled) return null;
  return (
    <div aria-hidden="true" data-cursor-root className="pointer-events-none fixed inset-0 z-[100]">
      <div ref={dot} className="absolute -left-1 -top-1 h-2 w-2 bg-accent" />
      <div ref={ring} className="absolute -left-4 -top-4 h-8 w-8 border border-accent" />
    </div>
  );
}
