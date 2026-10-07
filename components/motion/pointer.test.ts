import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { hasFinePointer, clampMagnet, useFinePointer } from "./pointer";

describe("hasFinePointer", () => {
  it("reads the (pointer: fine) media query", () => {
    window.matchMedia = ((q: string) => ({ matches: q === "(pointer: fine)" })) as unknown as typeof window.matchMedia;
    expect(hasFinePointer()).toBe(true);
    window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia;
    expect(hasFinePointer()).toBe(false);
  });
});

describe("useFinePointer", () => {
  type Listener = () => void;
  function stub(initial: boolean) {
    const listeners = new Set<Listener>();
    const mql = {
      matches: initial,
      addEventListener: (_: string, l: Listener) => listeners.add(l),
      removeEventListener: (_: string, l: Listener) => listeners.delete(l),
    } as unknown as MediaQueryList;
    window.matchMedia = () => mql;
    return {
      set(v: boolean) {
        (mql as { matches: boolean }).matches = v;
        listeners.forEach((l) => l());
      },
    };
  }

  it("reflects the media query and updates on change", () => {
    const ctl = stub(true);
    const { result } = renderHook(() => useFinePointer());
    expect(result.current).toBe(true);
    act(() => ctl.set(false));
    expect(result.current).toBe(false);
  });
});

describe("clampMagnet", () => {
  it("scales the offset by strength and clamps to max", () => {
    expect(clampMagnet(100, 0.3, 20)).toBe(20);
    expect(clampMagnet(-100, 0.3, 20)).toBe(-20);
    expect(clampMagnet(40, 0.3, 20)).toBe(12);
  });
});
