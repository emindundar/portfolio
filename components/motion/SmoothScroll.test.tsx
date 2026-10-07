import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const fakeLenis = { on: vi.fn(), off: vi.fn(), raf: vi.fn() };

vi.mock("lenis/react", () => ({
  ReactLenis: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  useLenis: () => fakeLenis,
}));

vi.mock("lenis/dist/lenis.css", () => ({}));

import { SmoothScroll } from "./SmoothScroll";
import { gsap, ScrollTrigger } from "@/lib/motion";

describe("SmoothScroll bridge", () => {
  beforeEach(() => {
    fakeLenis.on.mockClear();
    fakeLenis.off.mockClear();
    fakeLenis.raf.mockClear();
  });

  it("binds lenis scroll to ScrollTrigger.update and unbinds on unmount", () => {
    const { unmount } = render(<SmoothScroll />);
    expect(fakeLenis.on).toHaveBeenCalledWith("scroll", ScrollTrigger.update);
    unmount();
    expect(fakeLenis.off).toHaveBeenCalledWith("scroll", ScrollTrigger.update);
  });

  it("drives lenis.raf from the gsap ticker and removes the same callback", () => {
    const add = vi.spyOn(gsap.ticker, "add");
    const remove = vi.spyOn(gsap.ticker, "remove");
    const { unmount } = render(<SmoothScroll />);
    const fn = add.mock.calls[0]![0] as (time: number) => void;
    fn(2);
    expect(fakeLenis.raf).toHaveBeenCalledWith(2000);
    unmount();
    expect(remove).toHaveBeenCalledWith(fn);
    add.mockRestore();
    remove.mockRestore();
  });
});
