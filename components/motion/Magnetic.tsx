"use client";

import { lazy, Suspense, useState, useCallback, cloneElement, isValidElement, type ReactElement, type Ref } from "react";
import { useReducedMotion } from "./useReducedMotion";

type Props = { strength?: number; max?: number; children: ReactElement<{ ref?: React.Ref<HTMLElement> }> };

// GSAP loads after hydration. The child is always rendered here and never remounted (so focus is never lost);
// the lazy component is effect-only and is not mounted under reduced motion.
const Impl = lazy(() => import("./Magnetic.impl").then((m) => ({ default: m.MagneticImpl })));

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

export function Magnetic({ strength = 0.3, max = 24, children }: Props) {
  // Callback ref + state: the element reaches the effect without reading a ref during render.
  const [el, setEl] = useState<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const childRef = isValidElement<{ ref?: Ref<HTMLElement> }>(children) ? children.props.ref : undefined;
  // Stable per child ref so React does not detach/re-attach on every render.
  const mergedRef = useCallback(
    (node: HTMLElement | null) => {
      setEl(node);
      assignRef(childRef, node);
    },
    [childRef],
  );

  if (!isValidElement(children)) return children;
  return (
    <>
      {cloneElement(children, { ref: mergedRef, "data-magnetic": "" } as Record<string, unknown>)}
      {!reduced && el && (
        <Suspense fallback={null}>
          <Impl el={el} strength={strength} max={max} />
        </Suspense>
      )}
    </>
  );
}
