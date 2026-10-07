import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";

vi.mock("./useReducedMotion", () => ({ useReducedMotion: () => false }));
// Simulate a failed lazy chunk (network error / stale deploy): importing the impl rejects.
vi.mock("./SplitReveal.impl", () => {
  throw new Error("chunk load failed");
});
vi.mock("./SectionReveal.impl", () => {
  throw new Error("chunk load failed");
});
vi.mock("./Magnetic.impl", () => {
  throw new Error("chunk load failed");
});

import { SplitReveal } from "./SplitReveal";
import { SectionReveal } from "./SectionReveal";
import { Magnetic } from "./Magnetic";

describe("motion wrappers when the lazy chunk fails", () => {
  it("keep rendering the static content instead of throwing", async () => {
    render(
      <>
        <SplitReveal as="h1">Headline</SplitReveal>
        <SectionReveal>
          <p>Section body</p>
        </SectionReveal>
        <Magnetic>
          <a href="#x">Link</a>
        </Magnetic>
      </>,
    );
    // Let the rejected imports settle and React resolve the Suspense boundaries.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Headline");
    expect(screen.getByText("Section body")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Link" })).toHaveAttribute("href", "#x");
  });
});
