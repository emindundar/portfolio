"use client";

import { useRef } from "react";
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
  const ref = useRef<HTMLElement>(null);
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
          return gsap.from(self.lines, {
            yPercent: 110,
            duration: 0.9,
            stagger: 0.08,
            delay,
            ease: EASE.out,
          });
        },
      });
      return () => {
        if (split.isSplit) split.revert();
      };
    },
    { dependencies: [reduced, children], revertOnUpdate: true },
  );

  // ref tipi: Tag dinamik olduğu için HTMLElement; JSX'te cast gerekir.
  const Comp = Tag as unknown as React.ElementType;
  return (
    <Comp ref={ref} className={className}>
      {children}
    </Comp>
  );
}
