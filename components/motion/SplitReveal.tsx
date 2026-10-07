"use client";

import { useRef, type ElementType } from "react";
import { gsap, useGSAP, SplitText, EASE } from "@/lib/motion";
import { useReducedMotion } from "./useReducedMotion";

type Tag = "h1" | "h2" | "h3" | "p";

type Props = {
  as?: Tag;
  className?: string;
  delay?: number;
  children: string;
};

export function SplitReveal({ as: Tag = "h1", className, delay = 0, children }: Props) {
  const ref = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced || !ref.current) return;
      const split = SplitText.create(ref.current, {
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
    { dependencies: [reduced, children, delay], revertOnUpdate: true },
  );

  const Comp: ElementType = Tag;
  return (
    <Comp ref={ref} className={className}>
      {children}
    </Comp>
  );
}
