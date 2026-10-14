import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { JsonLd } from "./JsonLd";

describe("JsonLd", () => {
  it("renders one script whose payload parses back and cannot close the element", () => {
    const { container } = render(<JsonLd data={{ name: "</script>" }} />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    expect(JSON.parse(scripts[0]!.textContent!)).toEqual({ name: "</script>" });
    expect(scripts[0]!.innerHTML).not.toContain("</script");
  });
});
