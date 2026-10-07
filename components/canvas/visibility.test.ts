import { describe, it, expect, vi, beforeEach } from "vitest";
import { createVisibilityController, isSoftwareRenderer, supportsWebGL } from "./visibility";

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

describe("isSoftwareRenderer", () => {
  it.each([
    "Google SwiftShader",
    "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)",
    "llvmpipe (LLVM 15.0.7, 256 bits)",
    "Mesa OffScreen",
    "Microsoft Basic Render Driver",
  ])("flags %s as software", (name) => {
    expect(isSoftwareRenderer(name)).toBe(true);
  });

  it.each([
    "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)",
    "NVIDIA GeForce RTX 3060/PCIe/SSE2",
    "",
  ])("treats %j as hardware", (name) => {
    expect(isSoftwareRenderer(name)).toBe(false);
  });
});

describe("supportsWebGL", () => {
  function stubContext(opts: { renderer?: string; hasExt?: boolean; noContext?: boolean }) {
    const loseContext = vi.fn();
    const gl = {
      getExtension: (name: string) => {
        if (name === "WEBGL_lose_context") return { loseContext };
        if (name === "WEBGL_debug_renderer_info") return opts.hasExt === false ? null : { UNMASKED_RENDERER_WEBGL: 1 };
        return null;
      },
      getParameter: (p: number) => (p === 1 ? opts.renderer : null),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() =>
      opts.noContext ? null : gl) as unknown as HTMLCanvasElement["getContext"]);
    return loseContext;
  }

  beforeEach(() => vi.restoreAllMocks());

  it("is false on a software renderer", () => {
    const lose = stubContext({ renderer: "SwiftShader" });
    expect(supportsWebGL()).toBe(false);
    expect(lose).toHaveBeenCalled();
  });

  it("is true on a hardware renderer", () => {
    const lose = stubContext({ renderer: "Apple M2" });
    expect(supportsWebGL()).toBe(true);
    expect(lose).toHaveBeenCalled();
  });

  it("assumes hardware when the debug renderer extension is missing", () => {
    stubContext({ hasExt: false });
    expect(supportsWebGL()).toBe(true);
  });

  it("is false when no context is available", () => {
    stubContext({ noContext: true });
    expect(supportsWebGL()).toBe(false);
  });
});
