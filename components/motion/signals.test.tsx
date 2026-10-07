import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useReducedMotion } from "./useReducedMotion";
import { useFinePointer } from "./pointer";

vi.mock("./useReducedMotion", () => ({ useReducedMotion: vi.fn(() => false) }));
vi.mock("./pointer", () => ({ useFinePointer: vi.fn(() => true) }));
// The lazy SmoothScroll/Cursor chunks are not under test here.
vi.mock("next/dynamic", () => ({ default: () => () => null }));

import { MotionProvider } from "./MotionProvider";
import { Cursor } from "./Cursor";

describe("motion decision signals", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.motion;
    delete document.body.dataset.cursor;
    vi.mocked(useReducedMotion).mockReturnValue(false);
    vi.mocked(useFinePointer).mockReturnValue(true);
  });

  it("MotionProvider marks <html data-motion> with the live decision", () => {
    const { rerender } = render(<MotionProvider>x</MotionProvider>);
    expect(document.documentElement.dataset.motion).toBe("full");
    vi.mocked(useReducedMotion).mockReturnValue(true);
    rerender(<MotionProvider>x</MotionProvider>);
    expect(document.documentElement.dataset.motion).toBe("reduced");
  });

  it("Cursor states custom on a fine pointer and falls back to native on unmount", () => {
    const { unmount } = render(<Cursor />);
    expect(document.body.dataset.cursor).toBe("custom");
    unmount();
    expect(document.body.dataset.cursor).toBe("native");
  });

  it("Cursor states native on a coarse pointer", () => {
    vi.mocked(useFinePointer).mockReturnValue(false);
    render(<Cursor />);
    expect(document.body.dataset.cursor).toBe("native");
  });
});
