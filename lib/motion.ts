import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** gsap.matchMedia with the project's single reduced-motion condition. */
export function createMatchMedia() {
  return gsap.matchMedia();
}

export const EASE = { out: "expo.out", inOut: "expo.inOut", soft: "power2.out" } as const;
export const DUR = { fast: 0.25, base: 0.6, slow: 1.0 } as const;

export { gsap, useGSAP, ScrollTrigger, SplitText };
