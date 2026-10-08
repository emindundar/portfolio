import { describe, it, expect } from "vitest";
import { imageFor, videoFor, sizesFor } from "./media";

describe("imageFor", () => {
  it("builds srcSet from all manifest widths and picks the largest as src", () => {
    expect(imageFor("/media/events/devfest-izmir-24")).toEqual({
      src: "/media/events/devfest-izmir-24-1920.webp",
      srcSet:
        "/media/events/devfest-izmir-24-640.webp 640w, /media/events/devfest-izmir-24-1280.webp 1280w, /media/events/devfest-izmir-24-1920.webp 1920w",
      width: 1920,
      height: 1440,
    });
  });
  it("keeps real intrinsic size for narrow single-width images", () => {
    expect(imageFor("/media/gymai/cover")).toEqual({
      src: "/media/gymai/cover-640.webp",
      srcSet: "/media/gymai/cover-640.webp 368w",
      width: 368,
      height: 244,
    });
  });
  it("returns null for video entries and unknown bases", () => {
    expect(imageFor("/media/karaoke-sync/cover")).toBeNull();
    expect(imageFor("/media/nope/none")).toBeNull();
  });
});

describe("videoFor", () => {
  it("returns sources, poster and dimensions", () => {
    expect(videoFor("/media/karaoke-sync/cover")).toEqual({
      mp4: "/media/karaoke-sync/cover.mp4",
      webm: "/media/karaoke-sync/cover.webm",
      poster: "/media/karaoke-sync/poster-1280.webp",
      width: 1026,
      height: 720,
    });
  });
  it("returns null for images and unknown bases", () => {
    expect(videoFor("/media/gymai/cover")).toBeNull();
    expect(videoFor("/media/nope/none")).toBeNull();
  });
});

describe("sizesFor", () => {
  it("differs by kind", () => {
    expect(sizesFor("list")).toBe("(min-width: 768px) 40vw, 100vw");
    expect(sizesFor("hero")).toBe("100vw");
  });
});
