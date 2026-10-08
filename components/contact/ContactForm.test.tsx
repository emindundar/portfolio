import { useEffect } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { BUDGETS, HONEYPOT_FIELD, type ContactState } from "@/lib/contact";

const state = vi.hoisted(() => ({ current: { status: "idle" } as ContactState, pending: false, recover: false }));
vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  useActionState: () => [state.current, vi.fn(), state.pending],
}));
vi.mock("@/app/[locale]/contact/actions", () => ({ sendContact: vi.fn() }));
// Button.tsx (source of buttonClasses) imports the locale-aware Link, which needs the Next runtime.
vi.mock("@/i18n/navigation", () => ({ Link: "a" }));
// Stands in for a blocked Cloudflare script: the widget reports itself unavailable as soon as it mounts.
vi.mock("./Turnstile", () => ({
  Turnstile: ({ onUnavailable, onAvailable }: { onUnavailable: () => void; onAvailable: () => void }) => {
    useEffect(() => {
      onUnavailable();
      // A transient error followed by a successful challenge (the widget's success callback).
      if (state.recover) onAvailable();
    }, [onUnavailable, onAvailable]);
    return <div data-turnstile />;
  },
}));

import { ContactForm } from "./ContactForm";

const LINKEDIN = "https://www.linkedin.com/in/emindundar";
const EMPTY = { name: "", email: "", message: "", budget: "" };

function show(s: ContactState, { pending = false, siteKey = "" } = {}) {
  state.current = s;
  state.pending = pending;
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ContactForm locale="en" siteKey={siteKey} linkedinUrl={LINKEDIN} budgets={BUDGETS} honeypotField={HONEYPOT_FIELD} />
    </NextIntlClientProvider>,
  );
}

describe("ContactForm", () => {
  it("idle: labelled fields, hidden honeypot out of the tab order, no status", () => {
    const { container } = show({ status: "idle" });
    expect(screen.getByLabelText("Name")).toBeRequired();
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Message")).toHaveAttribute("maxlength", "2000");
    expect(screen.getByLabelText("Message")).toHaveAttribute("aria-describedby", "contact-message-hint");
    const trap = container.querySelector('input[name="contact_ref"]')!;
    expect(trap).toHaveAttribute("tabindex", "-1");
    expect(trap).toHaveAttribute("autocomplete", "off");
    expect(trap.closest("[aria-hidden='true']")).not.toBeNull();
    expect(container.querySelector("[data-contact-status]")).toBeNull();
    expect(container.querySelector("[data-turnstile]")).toBeNull();
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
    expect(screen.getAllByRole("option").map((o) => (o as HTMLOptionElement).value)).toEqual(["", ...BUDGETS]);
  });
  it("says where the data goes, right under the submit button, naming both processors", () => {
    const { container } = show({ status: "idle" });
    const note = container.querySelector("[data-contact-privacy]")!;
    expect(note).toHaveTextContent(/through Resend and used only to reply/);
    expect(note).toHaveTextContent(/Cloudflare Turnstile .* sees your IP address/);
    expect(note).toHaveTextContent(/No cookies/);
    const button = screen.getByRole("button", { name: "Send message" });
    expect(button.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector("form")).toContainElement(note as HTMLElement);
  });
  it("the bot-check alert does not ask for a reload (the form remounts with a fresh token)", () => {
    show({ status: "error", code: "turnstile", values: EMPTY });
    expect(screen.getByRole("alert")).toHaveTextContent("The bot check did not complete. Try again, or reach me on LinkedIn");
    expect(screen.getByRole("alert")).not.toHaveTextContent(/reload/i);
  });
  it("pending: button disabled and renamed", () => {
    show({ status: "idle" }, { pending: true });
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  });
  it("field errors: refilled values, aria-invalid, described by the error, alert summary", () => {
    show({ status: "error", code: "invalid", fieldErrors: { email: "invalid" }, values: { name: "Ada", email: "nope", message: "hello hello hello", budget: "1k-5k" } });
    const email = screen.getByLabelText("E-mail");
    expect(email).toHaveValue("nope");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(email.getAttribute("aria-describedby")!)).toHaveTextContent("This does not look right.");
    expect(email).toHaveFocus();
    expect(screen.getByLabelText("Name")).toHaveValue("Ada");
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Budget (optional)")).toHaveValue("1k-5k");
    expect(screen.getByRole("alert")).toHaveTextContent("Some fields need attention.");
    expect(screen.getByRole("alert").querySelector("a")).toBeNull();
  });
  it("message error: described by the error and the hint, focus on the first invalid field", () => {
    show({ status: "error", code: "invalid", fieldErrors: { message: "tooShort", email: "required" }, values: { ...EMPTY, name: "Ada", message: "hi" } });
    const message = screen.getByLabelText("Message");
    expect(message).toHaveAttribute("aria-describedby", "contact-message-error contact-message-hint");
    expect(message).toHaveAccessibleDescription("This is too short. 10 to 2000 characters.");
    expect(screen.getByLabelText("E-mail")).toHaveFocus();
  });
  it("unavailable: message plus a LinkedIn link", () => {
    show({ status: "error", code: "unavailable", values: EMPTY });
    expect(screen.getByRole("alert")).toHaveTextContent("The form is not available right now.");
    expect(screen.getByRole("alert").querySelector("a")).toHaveAttribute("href", LINKEDIN);
  });
  it("bot check cannot load: alert with the LinkedIn fallback instead of a dead button", () => {
    show({ status: "idle" }, { siteKey: "site-key" });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("The bot check did not complete.");
    expect(alert.querySelector("a")).toHaveAttribute("href", LINKEDIN);
    expect(alert.querySelector("a")).toHaveAttribute("rel", "noreferrer noopener");
  });
  it("bot check recovers after a transient error: the alert goes away", () => {
    state.recover = true;
    try {
      show({ status: "idle" }, { siteKey: "site-key" });
      expect(screen.queryByRole("alert")).toBeNull();
    } finally {
      state.recover = false;
    }
  });
  it("success: form replaced by a status message that takes focus", () => {
    const { container } = show({ status: "success" });
    expect(container.querySelector("form")).toBeNull();
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Message sent.");
    expect(status).toHaveFocus();
    expect(screen.getByRole("link", { name: "Send another message" })).toHaveAttribute("href", "/en/contact");
  });
});
