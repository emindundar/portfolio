import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

const create = vi.hoisted(() => vi.fn(() => ({ revert: vi.fn() })));

vi.mock("./useReducedMotion", () => ({ useReducedMotion: () => false }));
vi.mock("@/lib/motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/motion")>();
  return { ...actual, SplitText: { create } };
});

import { SplitRevealImpl } from "./SplitReveal.impl";

function renderImpl() {
  const h1 = document.createElement("h1");
  h1.textContent = "I build products end to end.";
  document.body.appendChild(h1);
  render(<SplitRevealImpl el={h1} delay={0} text="I build products end to end." />);
  return h1;
}

describe("SplitRevealImpl late-arrival guard", () => {
  beforeEach(() => {
    create.mockClear();
    window.scrollY = 0;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("splits the headline when the chunk arrives early at the top of the page", () => {
    vi.spyOn(performance, "now").mockReturnValue(400);
    renderImpl();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("skips the entrance when the chunk arrives after the text was already readable", () => {
    vi.spyOn(performance, "now").mockReturnValue(1500);
    const h1 = renderImpl();
    expect(create).not.toHaveBeenCalled();
    expect(h1.children).toHaveLength(0);
    expect(h1.textContent).toBe("I build products end to end.");
  });

  it("skips the entrance when the page is already scrolled", () => {
    vi.spyOn(performance, "now").mockReturnValue(400);
    window.scrollY = 300;
    renderImpl();
    expect(create).not.toHaveBeenCalled();
  });
});
