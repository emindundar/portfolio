import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next/script", () => ({ default: (p: Record<string, unknown>) => <script data-testid="umami" {...p} /> }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function load(id?: string, domains?: string) {
  if (id !== undefined) vi.stubEnv("NEXT_PUBLIC_UMAMI_ID", id);
  vi.stubEnv("NEXT_PUBLIC_UMAMI_DOMAINS", domains ?? "");
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
  it("has no data-domains attribute unless NEXT_PUBLIC_UMAMI_DOMAINS is set", async () => {
    expect((await load("abc-1234")).getByTestId("umami")).not.toHaveAttribute("data-domains");
  });
  it("restricts reporting to the configured hostnames", async () => {
    const s = (await load("abc-1234", " emindundar.dev, eminsportfolio.vercel.app ")).getByTestId("umami");
    expect(s).toHaveAttribute("data-domains", "emindundar.dev,eminsportfolio.vercel.app");
  });
  it("ignores a domain list that is not a plain hostname list", async () => {
    expect((await load("abc-1234", 'a.dev" onload="x')).getByTestId("umami")).not.toHaveAttribute("data-domains");
  });
  it("ignores an id that is not a plain token", async () => {
    expect((await load('"><script>')).container).toBeEmptyDOMElement();
  });
});
