import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, Flip);

export const EASE = { out: "expo.out", inOut: "expo.inOut", soft: "power2.out" } as const;

export { gsap, useGSAP, ScrollTrigger, SplitText, Flip };
