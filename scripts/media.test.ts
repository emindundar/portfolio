// @vitest-environment node
import { describe, it, expect } from "vitest";
import { targetSizes, outputName } from "./media";

describe("media script helpers", () => {
  it("never upscales: picks only sizes <= source width, at least the smallest", () => {
    expect(targetSizes(500)).toEqual([640]);
    expect(targetSizes(1000)).toEqual([640]);
    expect(targetSizes(1300)).toEqual([640, 1280]);
    expect(targetSizes(4032)).toEqual([640, 1280, 1920]);
  });
  it("builds output names", () => {
    expect(outputName("cover", 1280)).toBe("cover-1280.webp");
  });
});

import { manifestKey, serializeManifest, isStale, videoScaleFilter } from "./media";

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
});
