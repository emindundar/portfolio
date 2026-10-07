"use client";

import { gsap, useGSAP, SplitText, EASE } from "@/lib/motion";

type Props = { el: HTMLElement | null; delay: number; text: string };

// Effect-only: the heading element itself is rendered (and stays mounted) by SplitReveal.tsx,
// so loading this chunk never remounts the DOM or drops focus.
export function SplitRevealImpl({ el, delay, text }: Props) {
  useGSAP(
    () => {
      if (!el) return;
      const split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        aria: "auto",
        onSplit(self) {
          // mask uses overflow: clip; pad the bottom so descenders (p, g, y) are not cut, offset by a negative margin.
          gsap.set(self.masks, { paddingBottom: "0.15em", marginBottom: "-0.15em" });
          return gsap.from(self.lines, {
            yPercent: 110,
            duration: 0.9,
            stagger: 0.08,
            delay,
            ease: EASE.out,
          });
        },
      });
      return () => split.revert();
    },
    { dependencies: [el, text, delay], revertOnUpdate: true },
  );
  return null;
}
