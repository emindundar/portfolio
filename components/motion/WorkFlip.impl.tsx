"use client";

import { useEffect, useRef } from "react";
import { gsap, useGSAP, Flip, EASE } from "@/lib/motion";

const LIST = "[data-work-list]";
const ITEM = "[data-work-item]";

// Effect-only. The filter is a server navigation (`?f=`), so the "before" layout has to be recorded while the
// old list is still on screen: at the click on a filter chip, or at popstate (back/forward). Both fire before
// React commits the new list. After the commit (`facet` changes) the recorded state is replayed with Flip;
// rows are matched by `data-flip-id`, so it works whether React kept the nodes (it does: key = slug) or not.
export function WorkFlipImpl({ facet }: { facet: string }) {
  const before = useRef<Flip.FlipState | null>(null);

  useEffect(() => {
    const capture = () => {
      before.current = Flip.getState(ITEM);
    };
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest("[data-work-filter] a")) capture();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", capture);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", capture);
    };
  }, []);

  useGSAP(
    () => {
      const list = document.querySelector<HTMLElement>(LIST);
      const state = before.current;
      before.current = null;
      if (!list) return;
      const ready = () => {
        list.dataset.workReady = facet;
      };
      if (!state) {
        ready();
        return;
      }
      delete list.dataset.workReady;
      // No `absolute: true`: rows keep their size, so transforms alone are enough and the list keeps its
      // final height during the tween (absolute positioning would collapse it and make the footer jump).
      Flip.from(state, {
        targets: ITEM,
        duration: 0.5,
        ease: EASE.inOut,
        onEnter: (els) =>
          gsap.fromTo(els, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.03, ease: EASE.out }),
        onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.2 }),
        onComplete: () => {
          gsap.set(ITEM, { clearProps: "transform,opacity" });
          ready();
        },
      });
      // Interrupted (next filter clicked mid-flight) → revertOnUpdate restores the rows; nothing stays hidden.
    },
    { dependencies: [facet], revertOnUpdate: true },
  );

  return null;
}
