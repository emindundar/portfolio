import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Metrics } from "./Metrics";

describe("Metrics", () => {
  it("renders dt before dd for each item", () => {
    const { container } = render(<Metrics items={[{ label: "Users", value: "10k" }]} />);
    const group = container.querySelector("dl > div");
    expect(group?.children[0]?.tagName).toBe("DT");
    expect(group?.children[0]?.textContent).toBe("Users");
    expect(group?.children[1]?.tagName).toBe("DD");
    expect(group?.children[1]?.textContent).toBe("10k");
  });
});
