import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlowDiagram } from "./FlowDiagram";

describe("FlowDiagram", () => {
  it("renders an ordered list with one li per step and aria-hidden arrows inside following items", () => {
    const { container } = render(<FlowDiagram steps={["A", "B", "C"]} label="Flow" />);
    const ol = screen.getByRole("list", { name: "Flow" });
    expect(ol.tagName).toBe("OL");
    expect(ol.querySelectorAll(":scope > li")).toHaveLength(3);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });
});
