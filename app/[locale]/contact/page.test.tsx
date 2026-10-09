import { CONTACT_EMAIL } from "@/lib/site";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const en = (await import("@/messages/en.json")).default;
  return {
    setRequestLocale: () => {},
    getTranslations: async ({ namespace }: { namespace: string }) => createTranslator({ locale: "en", messages: en, namespace: namespace as "Contact" }),
  };
});
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("notFound"); } }));
vi.mock("@/components/contact/ContactForm", () => ({ ContactForm: () => <form data-contact-form /> }));

import ContactPage from "./page";

describe("contact page", () => {
  it("names the outbound links with a space before the new-tab note", async () => {
    render(await ContactPage({ params: Promise.resolve({ locale: "en" }) }));
    for (const [label, href] of [["LinkedIn", "https://www.linkedin.com/in/emindundar"], ["GitHub", "https://github.com/emindundar"]] as const) {
      const link = screen.getByRole("link", { name: `${label} (opens in a new tab)` });
      expect(link).toHaveAttribute("href", href);
      expect(link.querySelector(".sr-only")!.textContent).toBe("(opens in a new tab)");
    }
  });
  it("publishes the contact address as a plain mailto link (owner decision, plan deviation 5)", async () => {
    const { container } = render(await ContactPage({ params: Promise.resolve({ locale: "en" }) }));
    const mail = container.querySelector('a[href^="mailto:"]')!;
    expect(mail).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
    expect(mail).toHaveTextContent(CONTACT_EMAIL);
    expect(mail).not.toHaveAttribute("target");
  });
});
