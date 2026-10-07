"use client";

import { useEffect } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger } from "@/lib/motion";

function ScrollBridge() {
  const lenis = useLenis();
  useEffect(() => {
    if (!lenis) return;
    const update = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(update);
      lenis.off("scroll", ScrollTrigger.update);
    };
  }, [lenis]);
  return null;
}

export function SmoothScroll() {
  return (
    <ReactLenis root options={{ autoRaf: false, lerp: 0.1, wheelMultiplier: 1 }}>
      <ScrollBridge />
    </ReactLenis>
  );
}
