"use client";

import { gsap, useGSAP, SplitText, EASE } from "@/lib/motion";

type Props = { el: HTMLElement | null; delay: number; text: string; mountedAt: number };

// Past this point (ms since the wrapper mounted) the headline has been readable for a while;
// replaying an entrance on already-read text is worse than no entrance at all.
const LATE_MS = 1200;

// Effect-only: the heading element itself is rendered (and stays mounted) by SplitReveal.tsx,
// so loading this chunk never remounts the DOM or drops focus.
export function SplitRevealImpl({ el, delay, text, mountedAt }: Props) {
  useGSAP(
    () => {
      if (!el) return;
      // Chunk arrived late (slow network) or the user already scrolled: keep the plain heading.
      if (performance.now() - mountedAt > LATE_MS || window.scrollY > 0) return;
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
