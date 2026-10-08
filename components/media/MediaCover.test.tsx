import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import type { Project } from "@/lib/content";
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
});
