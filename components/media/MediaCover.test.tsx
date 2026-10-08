import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { Project } from "@/lib/content";
// jsdom has no matchMedia; reduced motion = VideoCover's static poster branch.
vi.mock("@/components/motion/useReducedMotion", () => ({ useReducedMotion: () => true }));

import { MediaCover } from "./MediaCover";

function project(src: string, frame: "none" | "phone" | "browser" = "none") {
  return {
    slug: "x",
    year: 2026,
    title: "Title",
    facets: ["ai"],
    cover: { type: "image", src, frame },
  } as unknown as Project;
}

describe("MediaCover", () => {
  it("renders narrow images at intrinsic width inside a centering none-frame", () => {
    const { container } = render(<MediaCover project={project("/media/gymai/cover")} kind="list" facetLabels={["AI"]} />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("width")).toBe("368");
    expect(img?.parentElement?.getAttribute("data-frame")).toBe("none");
    expect(img?.parentElement?.className).toContain("justify-center");
  });
  it("falls back to TypoCover for an unknown cover base", () => {
    const { container } = render(<MediaCover project={project("/media/nope/none")} kind="list" facetLabels={["AI"]} />);
    expect(container.querySelector("[data-typo-cover]")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });
  it("list kind: typographic fallback is the compact variant, hero keeps the full one", () => {
    const list = render(<MediaCover project={project("/media/nope/none")} kind="list" facetLabels={["AI"]} />);
    expect(list.container.querySelector('[data-typo-cover][data-variant="compact"]')).not.toBeNull();
    const hero = render(<MediaCover project={project("/media/nope/none")} kind="hero" facetLabels={["AI"]} />);
    expect(hero.container.querySelector('[data-typo-cover][data-variant="full"]')).not.toBeNull();
  });
  it("list kind: a video cover is a lazy poster image, never a <video>", () => {
    const p = { ...project("/media/karaoke-sync/cover", "browser"), cover: { type: "video", src: "/media/karaoke-sync/cover", frame: "browser" } } as unknown as Project;
    const { container } = render(<MediaCover project={p} kind="list" facetLabels={["Web"]} priority />);
    expect(container.querySelector("video")).toBeNull();
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/media/karaoke-sync/poster-1280.webp");
    expect(img?.getAttribute("loading")).toBe("lazy");
    expect(img?.getAttribute("width")).toBe("1026");
    expect(img?.getAttribute("height")).toBe("720");
    expect(img?.getAttribute("alt")).toBe("Title");
    expect(container.querySelector('[data-frame="browser"]')).not.toBeNull();
  });
  it("hero kind: a video cover still renders VideoCover", () => {
    const p = { ...project("/media/karaoke-sync/cover", "browser"), cover: { type: "video", src: "/media/karaoke-sync/cover", frame: "browser" } } as unknown as Project;
    const { container } = render(<MediaCover project={p} kind="hero" facetLabels={["Web"]} />);
    // Rendered by VideoCover (its reduced-motion poster branch under the mock above).
    expect(container.querySelector("img[data-video-poster]")?.getAttribute("src")).toBe("/media/karaoke-sync/poster-1280.webp");
  });
});
