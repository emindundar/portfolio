import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./useReducedMotion", () => ({ useReducedMotion: () => true }));

import { SplitReveal } from "./SplitReveal";

describe("SplitReveal (reduced motion)", () => {
  it("renders the heading text as a single accessible node", () => {
    render(<SplitReveal as="h1">I build products end to end.</SplitReveal>);
    const h = screen.getByRole("heading", { level: 1 });
    expect(h).toHaveTextContent("I build products end to end.");
    expect(h.querySelectorAll("div").length).toBe(0);
  });

  it("passes className through", () => {
    render(<SplitReveal as="h2" className="font-display">x</SplitReveal>);
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("font-display");
  });
});
