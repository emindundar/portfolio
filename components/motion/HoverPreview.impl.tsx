"use client";

import { gsap, useGSAP } from "@/lib/motion";
import type { PreviewCover } from "./HoverPreview";

const OFFSET = 24;
const EDGE = 16;

// Effect-only: the box is rendered (hidden) by HoverPreview.tsx.
export function HoverPreviewImpl({ el, covers }: { el: HTMLElement; covers: Record<string, PreviewCover> }) {
  useGSAP(
    () => {
      const img = el.querySelector("img");
      if (!img) return;
      gsap.set(el, { autoAlpha: 0 });
      const xTo = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
      let current: string | null = null;

      const show = (v: boolean) => gsap.to(el, { autoAlpha: v ? 1 : 0, duration: 0.2, overwrite: "auto" });
      // Right of the pointer, vertically centred on it, kept inside the viewport.
      const target = (e: PointerEvent) => ({
        x: Math.max(EDGE, Math.min(e.clientX + OFFSET, window.innerWidth - el.offsetWidth - EDGE)),
        y: Math.max(EDGE, Math.min(e.clientY - el.offsetHeight / 2, window.innerHeight - el.offsetHeight - EDGE)),
      });

      const onMove = (e: PointerEvent) => {
        const row = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-work-item]") : null;
        const slug = row?.dataset.flipId ?? null;
        const cover = slug ? covers[slug] : undefined;
        const next = cover ? slug : null;
        if (next !== current) {
          current = next;
          if (!cover) {
            show(false);
            return;
          }
          img.width = cover.width;
          img.height = cover.height;
          img.src = cover.src;
          // New row: snap into place instead of flying across the list.
          gsap.set(el, target(e));
          show(true);
        }
        if (!cover) return;
        const t = target(e);
        xTo(t.x);
        yTo(t.y);
      };
      const onLeave = () => {
        current = null;
        show(false);
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
      return () => {
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("pointerleave", onLeave);
      };
    },
    { dependencies: [el, covers], revertOnUpdate: true },
  );
  return null;
}
