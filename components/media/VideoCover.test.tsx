import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";

const reduced = vi.hoisted(() => ({ value: true }));
vi.mock("@/components/motion/useReducedMotion", () => ({ useReducedMotion: () => reduced.value }));

import { VideoCover } from "./VideoCover";

type IOCallback = (entries: { isIntersecting: boolean }[]) => void;
let ioCallback: IOCallback | null = null;
const play = vi.fn(() => Promise.resolve());
const pause = vi.fn();

const props = { mp4: "/a.mp4", webm: "/a.webm", poster: "/p.webp", width: 100, height: 50, alt: "Alt", pauseLabel: "Pause video", playLabel: "Play video" };

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
    expect(img?.getAttribute("alt")).toBe("Alt");
    expect(container.querySelector("button")).toBeNull();
  });

  it("renders a muted looping video with the smaller mp4 before webm and plays/pauses on visibility", () => {
    reduced.value = false;
    const { container } = render(<VideoCover {...props} />);
    const video = container.querySelector("video[data-video-cover]") as HTMLVideoElement;
    expect(video).not.toBeNull();
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.hasAttribute("playsinline")).toBe(true);
    // The poster stays as the same <img> under the video (stable LCP element); the video carries the name.
    expect(video.hasAttribute("poster")).toBe(false);
    expect(video.getAttribute("aria-label")).toBe("Alt");
    const img = container.querySelector("img[data-video-poster]");
    expect(img?.getAttribute("src")).toBe("/p.webp");
    expect(img?.getAttribute("alt")).toBe("");
    const sources = container.querySelectorAll("source");
    expect(sources).toHaveLength(2);
    expect(sources[0]?.getAttribute("type")).toBe("video/mp4");
    expect(sources[1]?.getAttribute("type")).toBe("video/webm");
    ioCallback?.([{ isIntersecting: true }]);
    expect(play).toHaveBeenCalled();
    ioCallback?.([{ isIntersecting: false }]);
    expect(pause).toHaveBeenCalled();
  });

  it("toggle button pauses, swaps its name, keeps the video paused when it scrolls back into view, and resumes", () => {
    reduced.value = false;
    const { container, getByRole } = render(<VideoCover {...props} />);
    const video = container.querySelector("video") as HTMLVideoElement;
    ioCallback?.([{ isIntersecting: true }]);
    expect(play).toHaveBeenCalledTimes(1);

    const button = getByRole("button", { name: "Pause video" });
    expect(button.className).toContain("min-h-11");
    expect(button.className).toContain("min-w-11");
    fireEvent.click(button);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(getByRole("button", { name: "Play video" })).toBe(button);
    expect(video.hasAttribute("data-paused")).toBe(true);

    // Leaving and re-entering the viewport must not restart a video the user paused.
    ioCallback?.([{ isIntersecting: false }]);
    ioCallback?.([{ isIntersecting: true }]);
    expect(play).toHaveBeenCalledTimes(1);

    fireEvent.click(button);
    expect(play).toHaveBeenCalledTimes(2);
    expect(getByRole("button", { name: "Pause video" })).toBe(button);
    expect(video.hasAttribute("data-paused")).toBe(false);
  });
});
