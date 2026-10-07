"use client";

import { gsap, useGSAP, EASE } from "@/lib/motion";

// Effect-only: the wrapper element is rendered (and stays mounted) by SectionReveal.tsx.
export function SectionRevealImpl({ el }: { el: HTMLElement | null }) {
  useGSAP(
    () => {
      if (!el) return;
      const items = el.querySelectorAll<HTMLElement>("[data-reveal]");
      if (!items.length) return;
      gsap.from(items, {
        y: 24,
        opacity: 0,
        duration: 0.6,
        stagger: 0.03,
        ease: EASE.out,
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
        onStart: () => {
          gsap.set(items, { willChange: "transform, opacity" });
        },
        onComplete: () => {
          gsap.set(items, { clearProps: "transform,opacity,willChange" });
        },
      });
    },
    { dependencies: [el], revertOnUpdate: true },
  );
  return null;
}
