import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { BUDGETS, HONEYPOT_FIELD } from "@/lib/contact";

// The real Turnstile component; only the server action and Cloudflare's API are stand-ins.
// One stable state object: a new one per render would read as a new server answer (the form remounts on that).
const action = vi.hoisted(() => ({ fn: vi.fn(), idle: { status: "idle" } as const }));
vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  useActionState: () => [action.idle, action.fn, false],
}));
vi.mock("@/app/[locale]/contact/actions", () => ({ sendContact: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ Link: "a" }));

import { ContactForm } from "./ContactForm";

const CF = 'script[src^="https://challenges.cloudflare.com/turnstile/"]';
const script = () => document.head.querySelector<HTMLScriptElement>(CF);

function show() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ContactForm locale="en" siteKey="site-key" linkedinUrl="https://www.linkedin.com/in/x" budgets={BUDGETS} honeypotField={HONEYPOT_FIELD} />
    </NextIntlClientProvider>,
  );
}

/**
 * Cloudflare's API already on the page (so no script request; Turnstile.tsx caches its load promise per page),
 * then the first focus mounts the widget. Returns a way to issue a token the way Cloudflare does.
 */
async function armWithApi() {
  let opts: Record<string, unknown> | null = null;
  let host: HTMLElement | null = null;
  window.turnstile = {
    render: (el, o) => {
      host = el;
      opts = o;
      return "w1";
    },
    remove: vi.fn(),
  };
  fireEvent.focusIn(screen.getByLabelText("Name"));
  await waitFor(() => expect(opts).not.toBeNull());
  /** What Cloudflare does when a challenge passes: fill its hidden input, then call back. */
  const issueToken = (token: string) =>
    act(() => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "cf-turnstile-response";
      input.value = token;
      host!.appendChild(input);
      (opts!.callback as (t: string) => void)(token);
    });
  return { issueToken };
}

const submitButton = () => screen.getByRole("button", { name: /Send message|Sending…/ });
const form = () => document.querySelector<HTMLFormElement>("form[data-contact-form]")!;

beforeEach(() => action.fn.mockReset());
afterEach(() => {
  vi.useRealTimers();
  // A failed load clears Turnstile.tsx's cached promise, so the next test requests the script again.
  script()?.onerror?.(new Event("error"));
  delete window.turnstile;
  document.head.querySelectorAll("script").forEach((s) => s.remove());
});

describe("ContactForm × Turnstile loading", () => {
  it("does not request Cloudflare's script on mount; requests it on the first focus inside the form", () => {
    show();
    expect(script()).toBeNull();
    expect(document.querySelector("[data-turnstile]")).toBeNull();
    fireEvent.focusIn(screen.getByLabelText("Name"));
    expect(script()).not.toBeNull();
    expect(document.head.querySelectorAll(CF)).toHaveLength(1);
    fireEvent.focusIn(screen.getByLabelText("E-mail"));
    expect(document.head.querySelectorAll(CF)).toHaveLength(1);
  });
  it.each([
    ["pointerdown", (el: HTMLElement) => fireEvent.pointerDown(el)],
    ["input", (el: HTMLElement) => fireEvent.input(el, { target: { value: "A" } })],
  ])("%s inside the form also loads it", (_, fire) => {
    show();
    expect(script()).toBeNull();
    fire(screen.getByLabelText("Message"));
    expect(script()).not.toBeNull();
  });
  it("submit with a token runs the action once, carrying the token", async () => {
    show();
    const { issueToken } = await armWithApi();
    issueToken("tok-1");
    fireEvent.submit(form());
    await waitFor(() => expect(action.fn).toHaveBeenCalledTimes(1));
    expect((action.fn.mock.calls[0]![0] as FormData).get("cf-turnstile-response")).toBe("tok-1");
  });
  it("submit before the token: held (button busy, no action), sent once when the token arrives", async () => {
    show();
    const { issueToken } = await armWithApi();
    fireEvent.submit(form());
    fireEvent.submit(form());
    expect(action.fn).not.toHaveBeenCalled();
    expect(submitButton()).toBeDisabled();
    expect(submitButton()).toHaveTextContent("Sending…");
    issueToken("tok-2");
    await waitFor(() => expect(action.fn).toHaveBeenCalledTimes(1));
    expect((action.fn.mock.calls[0]![0] as FormData).get("cf-turnstile-response")).toBe("tok-2");
    expect(submitButton()).toBeEnabled();
  });
  it("no token within the wait: bot-check alert, nothing sent, button usable again", async () => {
    vi.useFakeTimers();
    show();
    fireEvent.focusIn(screen.getByLabelText("Name"));
    fireEvent.submit(form());
    expect(submitButton()).toBeDisabled();
    await act(async () => vi.advanceTimersByTime(8000));
    expect(screen.getByRole("alert")).toHaveTextContent("The bot check did not complete.");
    expect(submitButton()).toBeEnabled();
    expect(action.fn).not.toHaveBeenCalled();
  });
  it("script fails while a submit is held: the alert replaces the wait, nothing sent", async () => {
    show();
    fireEvent.focusIn(screen.getByLabelText("Name"));
    fireEvent.submit(form());
    await act(async () => script()!.onerror!(new Event("error")));
    expect(screen.getByRole("alert")).toHaveTextContent("The bot check did not complete.");
    expect(submitButton()).toBeEnabled();
    expect(action.fn).not.toHaveBeenCalled();
  });
});
