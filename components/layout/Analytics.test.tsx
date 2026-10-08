import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next/script", () => ({ default: (p: Record<string, unknown>) => <script data-testid="umami" {...p} /> }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load(id?: string) {
  if (id !== undefined) vi.stubEnv("NEXT_PUBLIC_UMAMI_ID", id);
  const { Analytics } = await import("./Analytics");
  return render(<Analytics />);
}

describe("Analytics", () => {
  it("renders nothing without a site id", async () => {
    expect((await load("")).container).toBeEmptyDOMElement();
  });
  it("loads the Umami script deferred, with the id and Do Not Track respected", async () => {
    const s = (await load("abc-1234")).getByTestId("umami");
    expect(s).toHaveAttribute("src", "https://cloud.umami.is/script.js");
    expect(s).toHaveAttribute("data-website-id", "abc-1234");
    expect(s).toHaveAttribute("data-do-not-track", "true");
    expect(s).toHaveAttribute("strategy", "afterInteractive");
  });
  it("ignores an id that is not a plain token", async () => {
    expect((await load('"><script>')).container).toBeEmptyDOMElement();
  });
});
