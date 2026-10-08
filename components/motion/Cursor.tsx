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

  // Always states the decision once mounted ("custom" hides the native cursor via globals.css).
  useEffect(() => {
    document.body.dataset.cursor = enabled ? "custom" : "native";
    return () => {
      document.body.dataset.cursor = "native";
    };
  }, [enabled]);

  useGSAP(
    () => {
      const dotEl = dot.current;
      const ringEl = ring.current;
      if (!enabled || !dotEl || !ringEl) return;
      gsap.set([dotEl, ringEl], { autoAlpha: 0 });
      const dx = gsap.quickTo(dotEl, "x", { duration: 0.08 });
      const dy = gsap.quickTo(dotEl, "y", { duration: 0.08 });
      const rx = gsap.quickTo(ringEl, "x", { duration: 0.35, ease: "power3.out" });
      const ry = gsap.quickTo(ringEl, "y", { duration: 0.35, ease: "power3.out" });
      // quickTo drives one numeric property; "scale" is an alias for two, which GSAP rejects
      // ("scale not eligible for reset") and then never scales. Hence one setter per axis.
      gsap.set(ringEl, { scale: 1 });
      const sx = gsap.quickTo(ringEl, "scaleX", { duration: 0.25 });
      const sy = gsap.quickTo(ringEl, "scaleY", { duration: 0.25 });
      const scaleTo = (v: number) => {
        sx(v);
        sy(v);
      };
      let hovering = false;
      let visible = false;
      const show = (v: boolean) => {
        if (visible === v) return;
        visible = v;
        gsap.to([dotEl, ringEl], { autoAlpha: v ? 1 : 0, duration: 0.2, overwrite: "auto" });
      };
      const onMove = (e: PointerEvent) => {
        if (!visible) {
          // First move after entering: snap into place instead of flying from the origin.
          gsap.set([dotEl, ringEl], { x: e.clientX, y: e.clientY });
        }
        dx(e.clientX);
        dy(e.clientY);
        rx(e.clientX);
        ry(e.clientY);
        show(true);
      };
      const onOver = (e: Event) => {
        const next = !!(e.target as Element).closest("a, button, [data-magnetic]");
        if (next === hovering) return;
        hovering = next;
        scaleTo(next ? 2.2 : 1);
      };
      const onLeave = () => show(false);
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerover", onOver);
      document.documentElement.addEventListener("pointerleave", onLeave);
      return () => {
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerover", onOver);
        document.documentElement.removeEventListener("pointerleave", onLeave);
      };
    },
    { dependencies: [enabled], revertOnUpdate: true },
  );

  if (!enabled) return null;
  return (
    <div aria-hidden="true" data-cursor-root className="pointer-events-none fixed inset-0 z-[100]">
      <div ref={dot} className="absolute -left-1 -top-1 h-2 w-2 bg-accent" />
      <div ref={ring} className="absolute -left-4 -top-4 h-8 w-8 border border-accent" />
    </div>
  );
}
