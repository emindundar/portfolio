// @vitest-environment node
import { describe, it, expect } from "vitest";
import { targetSizes, outputName, manifestKey, serializeManifest, isStale, videoScaleFilter, videoEntryWhenSkipped, webpOptions } from "./media";

describe("media script helpers", () => {
  it("never upscales: picks only sizes <= source width; below 640 a single -640 file", () => {
    expect(targetSizes(368)).toEqual([640]);
    expect(targetSizes(600)).toEqual([640]);
    expect(targetSizes(640)).toEqual([560, 640]);
    expect(targetSizes(1206)).toEqual([560, 640]);
    expect(targetSizes(1300)).toEqual([560, 640, 1280]);
    expect(targetSizes(4032)).toEqual([560, 640, 1280, 1920]);
  });
  it("photos keep q78; project covers and screenshots are q72 at effort 6", () => {
    expect(webpOptions("events")).toEqual({ quality: 78 });
    expect(webpOptions("about")).toEqual({ quality: 78 });
    expect(webpOptions("geotrack")).toEqual({ quality: 72, effort: 6 });
    expect(webpOptions("gymai")).toEqual({ quality: 72, effort: 6 });
  });
  it("builds output names", () => {
    expect(outputName("cover", 1280)).toBe("cover-1280.webp");
  });
});

describe("media manifest helpers", () => {
  it("builds extension-less public keys", () => {
    expect(manifestKey("geotrack", "cover")).toBe("/media/geotrack/cover");
  });
  it("serializes with sorted keys and a trailing newline", () => {
    const out = serializeManifest({
      "/media/karaoke-sync/cover": { video: true, poster: "/media/karaoke-sync/poster-1280.webp", width: 1026, height: 720 },
      "/media/events/a": { widths: [640, 1280], width: 1280, height: 960 },
    });
    expect(out.endsWith("}\n")).toBe(true);
    expect(Object.keys(JSON.parse(out))).toEqual(["/media/events/a", "/media/karaoke-sync/cover"]);
    expect(JSON.parse(out)["/media/events/a"]).toEqual({ widths: [640, 1280], width: 1280, height: 960 });
  });
  it("regenerates when the output is missing or older than its source", () => {
    expect(isStale(undefined, 100)).toBe(true);
    expect(isStale(50, 100)).toBe(true);
    expect(isStale(100, 100)).toBe(false);
    expect(isStale(150, 100)).toBe(false);
  });
  it("never upscales video", () => {
    expect(videoScaleFilter).toBe("scale=-2:'min(720,ih)'");
  });
  it("keeps the previous video entry when encoding is skipped but outputs exist", () => {
    const prev = { video: true as const, poster: "/media/k/poster-1280.webp", width: 1026, height: 720 };
    expect(videoEntryWhenSkipped(prev, true)).toEqual(prev);
    expect(videoEntryWhenSkipped(prev, false)).toBeUndefined();
    expect(videoEntryWhenSkipped(undefined, true)).toBeUndefined();
    expect(videoEntryWhenSkipped({ widths: [640], width: 640, height: 480 }, true)).toBeUndefined();
  });
});
