import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TypoCover } from "./TypoCover";

describe("TypoCover", () => {
  it("shows slug, year, facet labels and a captioned figure", () => {
    const { container } = render(<TypoCover slug="my-slug" year={2026} facetLabels={["AI", "Web"]} title="T" />);
    expect(screen.getByText("my-slug")).toBeTruthy();
    expect(screen.getByText("2026")).toBeTruthy();
    expect(screen.getByText("AI")).toBeTruthy();
    expect(screen.getByText("Web")).toBeTruthy();
    expect(screen.getByRole("figure")).toBeTruthy();
    expect(container.querySelector("figcaption")?.textContent).toContain("T");
    expect(container.querySelector("[data-typo-cover]")).not.toBeNull();
  });
});
