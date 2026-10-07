"use client";

import { useRef } from "react";
import { gsap, useGSAP, EASE } from "@/lib/motion";
import { useReducedMotion } from "./useReducedMotion";

export function SectionReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      // Reduced motion: never touch [data-reveal] (no gsap.set / from) so nothing is ever at opacity 0.
      if (reduced || !ref.current) return;
      const items = ref.current.querySelectorAll<HTMLElement>("[data-reveal]");
      if (!items.length) return;
      gsap.from(items, {
        y: 24,
        opacity: 0,
        duration: 0.6,
        stagger: 0.03,
        ease: EASE.out,
        scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
        onStart: () => {
          gsap.set(items, { willChange: "transform, opacity" });
        },
        onComplete: () => {
          gsap.set(items, { clearProps: "transform,opacity,willChange" });
        },
      });
    },
    { scope: ref, dependencies: [reduced], revertOnUpdate: true },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
