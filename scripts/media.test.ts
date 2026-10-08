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
