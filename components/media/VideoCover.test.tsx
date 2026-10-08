import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const reduced = vi.hoisted(() => ({ value: true }));
vi.mock("@/components/motion/useReducedMotion", () => ({ useReducedMotion: () => reduced.value }));

import { VideoCover } from "./VideoCover";

type IOCallback = (entries: { isIntersecting: boolean }[]) => void;
let ioCallback: IOCallback | null = null;
const play = vi.fn(() => Promise.resolve());
const pause = vi.fn();

const props = { mp4: "/a.mp4", webm: "/a.webm", poster: "/p.webp", width: 100, height: 50, alt: "Alt" };

beforeEach(() => {
  ioCallback = null;
  play.mockClear();
  pause.mockClear();
  HTMLMediaElement.prototype.play = play;
  HTMLMediaElement.prototype.pause = pause;
  (globalThis as { IntersectionObserver: unknown }).IntersectionObserver = class {
    constructor(cb: IOCallback) {
      ioCallback = cb;
    }
    observe() {}
    disconnect() {}
    unobserve() {}
  };
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});

describe("VideoCover", () => {
  it("renders only the poster image under reduced motion", () => {
    reduced.value = true;
    const { container } = render(<VideoCover {...props} />);
    expect(container.querySelector("video")).toBeNull();
    const img = container.querySelector("img[data-video-poster]");
    expect(img?.getAttribute("src")).toBe("/p.webp");
  });

  it("renders a muted looping video with webm before mp4 and plays/pauses on visibility", () => {
    reduced.value = false;
    const { container } = render(<VideoCover {...props} />);
    const video = container.querySelector("video[data-video-cover]") as HTMLVideoElement;
    expect(video).not.toBeNull();
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.hasAttribute("playsinline")).toBe(true);
    const sources = container.querySelectorAll("source");
    expect(sources).toHaveLength(2);
    expect(sources[0]?.getAttribute("type")).toBe("video/webm");
    expect(sources[1]?.getAttribute("type")).toBe("video/mp4");
    ioCallback?.([{ isIntersecting: true }]);
    expect(play).toHaveBeenCalled();
    ioCallback?.([{ isIntersecting: false }]);
    expect(pause).toHaveBeenCalled();
  });
});
