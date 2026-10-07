import { describe, it, expect, vi, beforeEach } from "vitest";
import { createVisibilityController } from "./visibility";

type IOCallback = (entries: { isIntersecting: boolean }[]) => void;

describe("createVisibilityController", () => {
  let ioCallback: IOCallback | null = null;
  const observe = vi.fn();
  const disconnect = vi.fn();

  beforeEach(() => {
    ioCallback = null;
    observe.mockClear();
    disconnect.mockClear();
    (globalThis as { IntersectionObserver: unknown }).IntersectionObserver = class {
      constructor(cb: IOCallback) {
        ioCallback = cb;
      }
      observe = observe;
      disconnect = disconnect;
      unobserve() {}
    };
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });

  it("reports visible only when intersecting and tab is visible", () => {
    const onChange = vi.fn();
    const el = document.createElement("div");
    createVisibilityController(el, onChange);
    expect(observe).toHaveBeenCalledWith(el);
    ioCallback?.([{ isIntersecting: true }]);
    expect(onChange).toHaveBeenLastCalledWith(true);
    ioCallback?.([{ isIntersecting: false }]);
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("goes hidden when the document is hidden even if intersecting", () => {
    const onChange = vi.fn();
    const el = document.createElement("div");
    createVisibilityController(el, onChange);
    ioCallback?.([{ isIntersecting: true }]);
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("dispose disconnects the observer and listener", () => {
    const onChange = vi.fn();
    const ctl = createVisibilityController(document.createElement("div"), onChange);
    ctl.dispose();
    expect(disconnect).toHaveBeenCalled();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
