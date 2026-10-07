import { useSyncExternalStore } from "react";

const FINE_POINTER_QUERY = "(pointer: fine)";

export function hasFinePointer(): boolean {
  return typeof window !== "undefined" && window.matchMedia(FINE_POINTER_QUERY).matches;
}

function subscribe(cb: () => void) {
  const mql = window.matchMedia(FINE_POINTER_QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

// Sunucuda ve hydration'da "kaba/yok" varsay: özel imleç sadece istemci onayladığında.
function getServerSnapshot() {
  return false;
}

export function useFinePointer(): boolean {
  return useSyncExternalStore(subscribe, hasFinePointer, getServerSnapshot);
}

/** Offset * strength, clamped to ±max so the element never leaves its hit box. */
export function clampMagnet(offset: number, strength: number, max: number): number {
  const v = offset * strength;
  return Math.max(-max, Math.min(max, v));
}
