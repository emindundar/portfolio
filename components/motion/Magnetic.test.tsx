import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./useReducedMotion", () => ({ useReducedMotion: () => false }));

import { Magnetic } from "./Magnetic";

describe("Magnetic", () => {
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({
      matches: q === "(pointer: fine)",
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
  });

  it("marks its single child with data-magnetic and keeps it a plain anchor", () => {
    render(
      <Magnetic>
        <a href="#x">x</a>
      </Magnetic>,
    );
    const a = screen.getByRole("link", { name: "x" });
    expect(a).toHaveAttribute("data-magnetic", "");
    expect(a).toHaveAttribute("href", "#x");
  });
});
