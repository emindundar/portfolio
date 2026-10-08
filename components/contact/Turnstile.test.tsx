import { describe, it, expect, vi, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { Turnstile } from "./Turnstile";

afterEach(() => {
  delete window.turnstile;
  document.head.querySelectorAll("script").forEach((s) => s.remove());
});

describe("Turnstile", () => {
  it("script loaded but the API is missing (content blocker stub) → reports itself unavailable", async () => {
    const onUnavailable = vi.fn();
    const onAvailable = vi.fn();
    render(<Turnstile siteKey="k" locale="en" onUnavailable={onUnavailable} onAvailable={onAvailable} />);
    const script = document.head.querySelector<HTMLScriptElement>('script[src^="https://challenges.cloudflare.com/turnstile/"]')!;
    // The request "succeeds" with an empty body: onload fires, window.turnstile stays undefined.
    script.onload!(new Event("load"));
    await waitFor(() => expect(onUnavailable).toHaveBeenCalledTimes(1));
    expect(onAvailable).not.toHaveBeenCalled();
  });
  it("after unmount nothing is reported", async () => {
    const onUnavailable = vi.fn();
    const view = render(<Turnstile siteKey="k" locale="en" onUnavailable={onUnavailable} onAvailable={vi.fn()} />);
    view.unmount();
    document.head.querySelector<HTMLScriptElement>("script")?.onload?.(new Event("load"));
    await new Promise((r) => setTimeout(r, 0));
    expect(onUnavailable).not.toHaveBeenCalled();
  });
});
