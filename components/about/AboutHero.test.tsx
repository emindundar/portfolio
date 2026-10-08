import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

const imageFor = vi.fn();
vi.mock("@/lib/media", () => ({ imageFor: (b: string) => imageFor(b) }));

import { AboutHero } from "./AboutHero";

describe("AboutHero", () => {
  beforeEach(() => imageFor.mockReset());

  it("is text-only when there is no portrait asset", () => {
    imageFor.mockReturnValue(null);
    const { container, getByRole } = render(<AboutHero title="About" intro="Hi" portraitAlt="Me" />);
    expect(getByRole("heading", { level: 1 }).textContent).toBe("About");
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders the portrait when the manifest has one", () => {
    imageFor.mockReturnValue({ src: "/media/about/portrait-1280.webp", srcSet: "a 640w", width: 1280, height: 1600 });
    const { container } = render(<AboutHero title="About" intro="Hi" portraitAlt="Me" />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/media/about/portrait-1280.webp");
    expect(img?.getAttribute("alt")).toBe("Me");
    expect(imageFor).toHaveBeenCalledWith("/media/about/portrait");
  });
});
