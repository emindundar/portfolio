import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { gsap } from "@/lib/motion";
import { useReducedMotion } from "./useReducedMotion";

vi.mock("./useReducedMotion", () => ({ useReducedMotion: vi.fn(() => false) }));

import { Magnetic } from "./Magnetic";

function settle() {
  act(() => {
    gsap.updateRoot(gsap.globalTimeline.time() + 2);
  });
}

// jsdom has no PointerEvent; a MouseEvent with the pointer event name carries clientX/clientY.
function move(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent("pointermove", { clientX: 40, clientY: 0, bubbles: true }));
  });
}

describe("Magnetic", () => {
  beforeEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    window.matchMedia = ((q: string) => ({
      matches: q === "(pointer: fine)",
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
  });

  it("marks its single child with data-magnetic and keeps it a plain anchor", () => {
    render(
      <Magnetic>
        <a href="#x">x</a>
      </Magnetic>,
    );
    const a = screen.getByRole("link", { name: "x" });
    expect(a).toHaveAttribute("data-magnetic", "");
    expect(a).toHaveAttribute("href", "#x");
  });

  it("moves toward the pointer while motion is allowed", () => {
    render(
      <Magnetic>
        <a href="#x">x</a>
      </Magnetic>,
    );
    const a = screen.getByRole("link", { name: "x" });
    move(a);
    settle();
    expect(Number(gsap.getProperty(a, "x"))).toBeGreaterThan(0);
  });

  it("detaches its listeners when reduced motion turns on live", () => {
    const { rerender } = render(
      <Magnetic>
        <a href="#x">x</a>
      </Magnetic>,
    );
    const a = screen.getByRole("link", { name: "x" });
    vi.mocked(useReducedMotion).mockReturnValue(true);
    rerender(
      <Magnetic>
        <a href="#x">x</a>
      </Magnetic>,
    );
    move(a);
    settle();
    expect(Number(gsap.getProperty(a, "x"))).toBe(0);
  });

  it("keeps the child's own callback and object refs working", () => {
    const fn = vi.fn();
    const obj = { current: null as HTMLAnchorElement | null };
    const { unmount } = render(
      <Magnetic>
        <a href="#x" ref={fn}>x</a>
      </Magnetic>,
    );
    const a = screen.getByRole("link", { name: "x" });
    expect(fn).toHaveBeenCalledWith(a);
    unmount();
    render(
      <Magnetic>
        <a href="#y" ref={obj}>y</a>
      </Magnetic>,
    );
    expect(obj.current).toBe(screen.getByRole("link", { name: "y" }));
  });
});
